import { computed, inject, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
    DataBrokerService,
    EntityResolverService,
    EntityType,
    EventCacheDb,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { isAfter } from 'date-fns';
import {
    catchError,
    defer,
    EMPTY,
    map,
    Observable,
    of,
    shareReplay,
    startWith,
    switchMap,
    take,
    takeWhile,
    withLatestFrom,
} from 'rxjs';
import { ChartSourceStatus } from './chart-source.types';
import { DashboardPauseGate } from '../refresh/pause-gate.service';

export interface QuerySource<VM> {
    readonly vm: Signal<VM | null>;
    readonly status: Signal<ChartSourceStatus>;
}

export interface QueryContext<P> {
    readonly instanceId: number;
    readonly param: P;
}

export interface QuerySourceConfig<TRow, VM, P = void> {
    readonly instanceId: Signal<number>;
    readonly eventTypes: PlatformEventType[];
    /** @default false */
    readonly live?: boolean;
    readonly param?: Signal<P>;
    readonly query: (db: EventCacheDb, ctx: QueryContext<P>) => Observable<TRow[]>;
    readonly map: (rows: TRow[], ctx: QueryContext<P>) => VM;
    readonly isEmpty?: (vm: VM) => boolean;
}

function defaultIsEmpty<VM>(vm: VM): boolean {
    if (vm === null || vm === undefined) return true;
    if (Array.isArray(vm)) return vm.length === 0;
    return false;
}

class QuerySourceBuilder<TRow, VM, P> {
    private readonly broker = inject(DataBrokerService);
    private readonly gate = inject(DashboardPauseGate, { optional: true });
    private readonly entityResolver = inject(EntityResolverService);

    private readonly isEmpty: (vm: VM) => boolean;
    private readonly status = signal<ChartSourceStatus>('idle');
    private hasEmitted = false;

    constructor(private readonly config: QuerySourceConfig<TRow, VM, P>) {
        this.isEmpty = config.isEmpty ?? defaultIsEmpty;
    }

    build(): QuerySource<VM> {
        const stream$ = this.config.live ? this.buildLiveStream() : this.buildOneShotStream();
        const vm = toSignal(stream$, { initialValue: null });
        return { vm, status: this.status.asReadonly() };
    }

    /**
     * One-shot source: resolves a single query result and never refreshes.
     * Emits null with 'idle' status while no valid instance is selected.
     */
    private buildOneShotStream(): Observable<VM | null> {
        return this.ctx$().pipe(
            switchMap((ctx) => {
                if (ctx.instanceId <= 0) {
                    this.status.set('idle');
                    return of(null);
                }
                return this.withStatusTracking$(this.mapRows$(this.fetchRows$(ctx), ctx));
            }),
        );
    }

    /**
     * Live source: polls on the dashboard cadence while the instance is running,
     * obeys the pause gate, and stops once the instance end-time has passed.
     * An already-ended instance receives a single final snapshot instead of
     * polling, so finished dashboards still render their last known data.
     */
    private buildLiveStream(): Observable<VM | null> {
        const paused$ = this.gate ? toObservable(this.gate.paused) : of(false);
        return this.ctx$().pipe(
            switchMap((ctx) => {
                if (ctx.instanceId <= 0) {
                    this.status.set('idle');
                    return of(null);
                }
                return this.buildBoundedLiveStream$(paused$, ctx);
            }),
        );
    }

    /**
     * Polls immediately and resolves the instance end-time in parallel. Every
     * emission passes through; the first emission observed once the end-time is
     * in the past is the final one, after which the stream completes. The
     * end-time begins as null so the first paint never waits on its resolution,
     * and an already-ended instance still renders its final snapshot.
     *
     * @param paused$  Stream of the global pause-gate state.
     * @param ctx      The resolved query context.
     */
    private buildBoundedLiveStream$(
        paused$: Observable<boolean>,
        ctx: QueryContext<P>,
    ): Observable<VM | null> {
        const endTime$ = this.instanceEndTime$(ctx.instanceId).pipe(
            startWith(null),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
        return this.buildPausableStream$(paused$, ctx).pipe(
            withLatestFrom(endTime$),
            takeWhile(([, endTime]) => !this.isPastEnd(endTime), true),
            map(([vm]) => vm),
            catchError(() => {
                this.status.set('error');
                return of(null);
            }),
        );
    }

    /**
     * Whether the given end-time is known and already in the past.
     *
     * @param endTime  The instance end-time, or null when unresolved.
     */
    private isPastEnd(endTime: Date | null): boolean {
        return endTime !== null && isAfter(new Date(), endTime);
    }

    /**
     * Suspends polling while the pause gate is paused, retaining the last value
     * and leaving the status untouched; resumes polling when unpaused.
     *
     * @param paused$  Stream of the global pause-gate state.
     * @param ctx      The resolved query context.
     */
    private buildPausableStream$(
        paused$: Observable<boolean>,
        ctx: QueryContext<P>,
    ): Observable<VM | null> {
        return paused$.pipe(
            switchMap((paused) =>
                paused ? EMPTY : this.withStatusTracking$(this.mapRows$(this.pollRows$(ctx), ctx)),
            ),
        );
    }

    /**
     * Resolves the instance end-time once. Emits null when the instance cannot
     * be resolved.
     *
     * @param instanceId  The instance to resolve.
     */
    private instanceEndTime$(instanceId: number): Observable<Date | null> {
        return this.entityResolver.resolveMap(EntityType.Instance, [instanceId]).pipe(
            take(1),
            map((instanceMap) => instanceMap.get(instanceId)?.endTime ?? null),
        );
    }

    /**
     * Runs the configured query once against the event cache.
     *
     * @param ctx  The resolved query context.
     */
    private fetchRows$(ctx: QueryContext<P>): Observable<TRow[]> {
        return this.broker.query(this.config.instanceId, this.config.eventTypes, (db: EventCacheDb) =>
            this.config.query(db, ctx),
        );
    }

    /**
     * Runs the configured query on the polling cadence against the event cache.
     *
     * @param ctx  The resolved query context.
     */
    private pollRows$(ctx: QueryContext<P>): Observable<TRow[]> {
        return this.broker.queryPolling(this.config.instanceId, this.config.eventTypes, (db: EventCacheDb) =>
            this.config.query(db, ctx),
        );
    }

    /**
     * Projects raw rows into the view-model using the configured mapper.
     *
     * @param rows$  Stream of raw query rows.
     * @param ctx    The resolved query context.
     */
    private mapRows$(rows$: Observable<TRow[]>, ctx: QueryContext<P>): Observable<VM> {
        return rows$.pipe(map((rows) => this.config.map(rows, ctx)));
    }

    /**
     * Tracks status across a view-model stream: 'loading' on the first fetch,
     * 'refreshing' on a re-fetch that already has data, then 'ready' or 'empty'
     * per result. Contains errors as a null emission with 'error' status so the
     * source never tears down.
     *
     * @param vm$  Stream producing the mapped view-model.
     */
    private withStatusTracking$(vm$: Observable<VM>): Observable<VM | null> {
        return defer(() => {
            this.status.set(this.hasEmitted ? 'refreshing' : 'loading');
            return vm$;
        }).pipe(
            map((vm) => {
                this.hasEmitted = true;
                this.status.set(this.isEmpty(vm) ? 'empty' : 'ready');
                return vm;
            }),
            catchError(() => {
                this.status.set('error');
                return of(null);
            }),
        );
    }

    /**
     * Context signal stream — re-emits on instanceId or param change, driving
     * re-subscription of the underlying query.
     */
    private ctx$(): Observable<QueryContext<P>> {
        return toObservable(
            computed(() => ({
                instanceId: this.config.instanceId(),
                param: (this.config.param?.() ?? undefined) as P,
            })),
        );
    }
}

/**
 * Creates a reactive query source that bridges the event-cache broker to
 * Angular signals.
 *
 * Must be called inside an injection context.
 *
 * @param config Query configuration — see {@link QuerySourceConfig}.
 * @returns `{ vm, status }` signals.
 */
export function createQuerySource<TRow, VM, P = void>(
    config: QuerySourceConfig<TRow, VM, P>,
): QuerySource<VM> {
    return new QuerySourceBuilder(config).build();
}
