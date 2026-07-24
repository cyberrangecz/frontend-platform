import {
    catchError,
    concat,
    concatMap,
    defer,
    EMPTY,
    exhaustMap,
    filter,
    finalize,
    ignoreElements,
    map,
    merge,
    Observable,
    of,
    ReplaySubject,
    Subject,
    Subscription,
    take,
    tap,
    timer,
} from 'rxjs';
import { PlatformEventType } from '@crczp/visualization-model';
import { ErrorHandlerService } from '@crczp/utils';
import { LinearTrainingInstanceApi } from '@crczp/training-api';
import { CacheSyncService } from '../../sync/sync.interface';
import { SyncTableComplete } from '../../sync/sync-result.interface';
import { needsPoolId } from './pool-id-resolver';
import { notifyOutage } from './error-notifier';

const VOID = undefined as void;

/**
 * Drives a single training instance's event sync. Readers register the event types they need; the
 * driver syncs the union of all registered types on a timer and emits a tick after every completed
 * cycle, and readers re-query the cache on each tick. Each event type is synced once per cycle
 * regardless of how many readers want it.
 *
 * Lifecycle is reference-counted by event type: the union is the set of types with a non-zero count.
 * The polling timer runs only while the union is non-empty; emptying it suspends the timer (dormant)
 * while retaining the resolved pool id and the loaded-types set, so re-registering resumes instantly.
 *
 * Each reader's first emission is gated on readiness: it is withheld until every type that reader
 * requested has been loaded into the cache at least once, so a reader paints as soon as its own
 * types are present rather than waiting for the whole union. Subsequent emissions follow each
 * completed cycle.
 *
 * The sync loop is resilient: a failed cycle still emits a tick (readers that have already painted
 * keep their last data) and notifies the user once per outage rather than tearing the loop down.
 */
export class InstanceSyncDriver {
    private readonly referenceCounts = new Map<PlatformEventType, number>();
    private readonly loadedTypes = new Set<PlatformEventType>();
    private readonly loaded$ = new ReplaySubject<ReadonlySet<PlatformEventType>>(1);
    private readonly tick$ = new Subject<void>();
    private readonly wake$ = new Subject<void>();
    private loopSubscription: Subscription | null = null;
    private poolId: number | undefined;
    private poolIdResolved = false;
    private outageActive = false;

    /**
     * @param instanceId Training instance this driver syncs.
     * @param intervalMs Polling cadence between sync cycles.
     * @param syncService Performs the actual per-type fetch-and-insert sync.
     * @param instanceApi Resolves the instance's pool id when a pool-scoped type joins the union.
     * @param errorHandler Surfaces user-facing notifications on a sync outage.
     */
    constructor(
        private readonly instanceId: number,
        private readonly intervalMs: number,
        private readonly syncService: CacheSyncService,
        private readonly instanceApi: LinearTrainingInstanceApi,
        private readonly errorHandler: ErrorHandlerService,
    ) {}

    /**
     * Whether the polling timer is currently suspended because no reader is attached.
     */
    get dormant(): boolean {
        return this.loopSubscription === null;
    }

    /**
     * Attaches a reader. Registers its event types into the union on subscribe and removes them on
     * teardown. The first emission is withheld until every requested type has been loaded into the
     * cache at least once; the reader then emits again on each completed sync cycle.
     *
     * @param eventTypes Event types the reader needs synced; must contain at least one.
     * @returns A stream that emits once its requested types are all loaded, then once per cycle.
     * @throws {Error} When eventTypes is empty.
     */
    connect(eventTypes: PlatformEventType[]): Observable<void> {
        const types = [...new Set(eventTypes)];
        if (types.length === 0) {
            throw new Error('InstanceSyncDriver.connect requires at least one event type');
        }
        return defer(() => {
            this.register(types);
            const firstPaint = this.loaded$.pipe(
                filter((loaded) => types.every((type) => loaded.has(type))),
                take(1),
                map(() => VOID),
            );
            return concat(firstPaint, this.tick$);
        }).pipe(finalize(() => this.deregister(types)));
    }

    private register(types: PlatformEventType[]): void {
        const wasEmpty = this.referenceCounts.size === 0;
        let grew = false;
        for (const type of types) {
            const previous = this.referenceCounts.get(type) ?? 0;
            if (previous === 0) grew = true;
            this.referenceCounts.set(type, previous + 1);
        }
        if (wasEmpty) this.startLoop();
        else if (grew) this.wake$.next();
    }

    private deregister(types: PlatformEventType[]): void {
        for (const type of types) {
            const previous = this.referenceCounts.get(type) ?? 0;
            if (previous <= 1) this.referenceCounts.delete(type);
            else this.referenceCounts.set(type, previous - 1);
        }
        if (this.referenceCounts.size === 0) this.suspendLoop();
    }

    private startLoop(): void {
        if (this.loopSubscription) return;
        this.outageActive = false;
        this.loopSubscription = merge(timer(0, this.intervalMs), this.wake$)
            .pipe(exhaustMap(() => this.runCycle(0)))
            .subscribe(() => this.tick$.next());
    }

    private suspendLoop(): void {
        this.loopSubscription?.unsubscribe();
        this.loopSubscription = null;
    }

    private runCycle(depth: number): Observable<void> {
        return defer((): Observable<void> => {
            const snapshot = [...this.referenceCounts.keys()];
            const afterSync = defer((): Observable<void> => {
                this.outageActive = false;
                const grown = depth < 1 && this.unionGrewSince(snapshot);
                const continuation: Observable<void> = grown ? this.runCycle(depth + 1) : EMPTY;
                return concat(of(VOID), continuation);
            });
            return concat(this.syncUnion(snapshot), afterSync).pipe(
                catchError((err): Observable<void> => {
                    const notify: Observable<never> = this.outageActive
                        ? EMPTY
                        : notifyOutage(err, this.errorHandler).pipe(catchError(() => EMPTY));
                    this.outageActive = true;
                    return concat(of(VOID), notify);
                }),
            );
        });
    }

    private syncUnion(snapshot: PlatformEventType[]): Observable<void> {
        return this.resolvePoolIdIfNeeded(snapshot).pipe(
            concatMap(() =>
                this.syncService
                    .sync({
                        instanceId: this.instanceId,
                        eventTypes: snapshot,
                        ...(this.poolId !== undefined ? { poolId: this.poolId } : {}),
                    })
                    .pipe(
                        tap((complete: SyncTableComplete) => this.markLoaded(complete.eventType)),
                        ignoreElements(),
                    ),
            ),
        );
    }

    private resolvePoolIdIfNeeded(snapshot: PlatformEventType[]): Observable<void> {
        if (this.poolIdResolved || !needsPoolId(snapshot)) return of(VOID);
        return this.instanceApi.get(this.instanceId).pipe(
            take(1),
            tap((instance) => {
                this.poolId = instance.poolId;
                this.poolIdResolved = true;
            }),
            map(() => VOID),
        );
    }

    private markLoaded(eventType: PlatformEventType): void {
        if (this.loadedTypes.has(eventType)) return;
        this.loadedTypes.add(eventType);
        this.loaded$.next(new Set(this.loadedTypes));
    }

    private unionGrewSince(snapshot: PlatformEventType[]): boolean {
        const before = new Set(snapshot);
        for (const type of this.referenceCounts.keys()) {
            if (!before.has(type)) return true;
        }
        return false;
    }
}
