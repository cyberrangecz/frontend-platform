import { delay, from, map, merge, of, throwError, timer, ignoreElements, Observable } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { ErrorHandlerService } from '@crczp/utils';
import { InstanceSyncDriver } from './instance-sync-driver';
import { CacheSyncService } from '../../sync/sync.interface';
import { SyncTableComplete } from '../../sync/sync-result.interface';

const INSTANCE_ID = 1;
const INTERVAL_MS = 1000;
const TYPE_A = PlatformEventType.TRAINING_RUN_STARTED;
const TYPE_B = PlatformEventType.LEVEL_STARTED;

function complete(eventType: PlatformEventType): SyncTableComplete {
    return { eventType, instanceId: INSTANCE_ID };
}

describe('InstanceSyncDriver', () => {
    let syncService: { sync: ReturnType<typeof vi.fn> };
    let errorHandler: { emitFrontendErrorNotification: ReturnType<typeof vi.fn> };
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    function createDriver(): InstanceSyncDriver {
        return new InstanceSyncDriver(
            INSTANCE_ID,
            INTERVAL_MS,
            syncService as unknown as CacheSyncService,
            errorHandler as unknown as ErrorHandlerService,
        );
    }

    beforeEach(() => {
        // Default: a sync emits one SyncTableComplete per requested type, then completes — so every
        // synced type becomes loaded and gated readers can paint.
        syncService = {
            sync: vi.fn().mockImplementation((params: { instanceId: number; eventTypes: PlatformEventType[] }) =>
                from(params.eventTypes).pipe(map((eventType) => complete(eventType))),
            ),
        };
        errorHandler = { emitFrontendErrorNotification: vi.fn().mockReturnValue(of(true)) };
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        consoleErrorSpy.mockRestore();
    });

    it('throws when connecting with no event types', () => {
        const driver = createDriver();
        expect(() => driver.connect([])).toThrow();
    });

    it('starts dormant, activates on first connect, and suspends when the last reader leaves', async () => {
        const driver = createDriver();
        expect(driver.dormant).toBe(true);

        const subscription = driver.connect([TYPE_A]).subscribe();
        expect(driver.dormant).toBe(false);

        await vi.advanceTimersByTimeAsync(0);
        expect(syncService.sync).toHaveBeenCalledWith(
            expect.objectContaining({ instanceId: INSTANCE_ID, eventTypes: [TYPE_A] }),
        );

        subscription.unsubscribe();
        expect(driver.dormant).toBe(true);
    });

    it('withholds a reader’s first emission across a completed cycle until every requested type is loaded', async () => {
        const driver = createDriver();
        // First cycle completes loading only A; B does not load until a later cycle. A reader needing
        // both must stay withheld through the completed first cycle — proving the gate keys on the
        // reader's own type set, not merely on cycle completion.
        syncService.sync.mockReturnValueOnce(of(complete(TYPE_A)));

        const paints: number[] = [];
        const subscription = driver.connect([TYPE_A, TYPE_B]).subscribe(() => paints.push(1));

        await vi.advanceTimersByTimeAsync(0);
        expect(paints).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(INTERVAL_MS);
        expect(paints.length).toBeGreaterThanOrEqual(1);

        subscription.unsubscribe();
    });

    it('paints a reader as soon as its own types load, without waiting for the rest of the union', async () => {
        const driver = createDriver();
        // The cycle syncs both types; A lands immediately, B is delayed.
        syncService.sync.mockReturnValueOnce(merge(of(complete(TYPE_A)), of(complete(TYPE_B)).pipe(delay(500))));

        const widePaints: number[] = [];
        const lightPaints: number[] = [];
        const wide = driver.connect([TYPE_A, TYPE_B]).subscribe(() => widePaints.push(1));
        const light = driver.connect([TYPE_A]).subscribe(() => lightPaints.push(1));

        await vi.advanceTimersByTimeAsync(0);
        expect(lightPaints.length).toBeGreaterThanOrEqual(1);
        expect(widePaints).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(500);
        expect(widePaints.length).toBeGreaterThanOrEqual(1);

        wide.unsubscribe();
        light.unsubscribe();
    });

    it('paints a late subscriber immediately once its types are already loaded', async () => {
        const driver = createDriver();
        const first = driver.connect([TYPE_A]).subscribe();
        await vi.advanceTimersByTimeAsync(0);

        let painted = 0;
        const second = driver.connect([TYPE_A]).subscribe(() => painted++);
        expect(painted).toBe(1);

        first.unsubscribe();
        second.unsubscribe();
    });

    it('emits again on each subsequent completed cycle after the first paint', async () => {
        const driver = createDriver();
        const paints: number[] = [];

        const subscription = driver.connect([TYPE_A]).subscribe(() => paints.push(1));

        await vi.advanceTimersByTimeAsync(0);
        const afterFirstPaint = paints.length;
        expect(afterFirstPaint).toBeGreaterThanOrEqual(1);

        await vi.advanceTimersByTimeAsync(INTERVAL_MS);
        expect(paints.length).toBeGreaterThan(afterFirstPaint);

        subscription.unsubscribe();
    });

    it('syncs the union of all readers’ event types', async () => {
        const driver = createDriver();
        const first = driver.connect([TYPE_A]).subscribe();
        await vi.advanceTimersByTimeAsync(0);

        const second = driver.connect([TYPE_B]).subscribe();
        await vi.advanceTimersByTimeAsync(0);

        expect(syncService.sync).toHaveBeenLastCalledWith(
            expect.objectContaining({ eventTypes: expect.arrayContaining([TYPE_A, TYPE_B]) }),
        );

        first.unsubscribe();
        second.unsubscribe();
    });

    it('wakes for an off-cadence sync when a new type grows the union', async () => {
        const driver = createDriver();
        const first = driver.connect([TYPE_A]).subscribe();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncService.sync).toHaveBeenCalledTimes(1);

        // A new type joins well before the next interval — a wake triggers an immediate sync.
        const second = driver.connect([TYPE_B]).subscribe();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncService.sync).toHaveBeenCalledTimes(2);

        first.unsubscribe();
        second.unsubscribe();
    });

    it('runs a dirty re-sync for a type added while a sync is in flight', async () => {
        const driver = createDriver();
        // First cycle is slow; growth happens mid-flight and its wake is dropped by exhaustMap.
        syncService.sync.mockReturnValueOnce(timer(500).pipe(ignoreElements()) as unknown as Observable<never>);

        const first = driver.connect([TYPE_A]).subscribe();
        await vi.advanceTimersByTimeAsync(100);

        const second = driver.connect([TYPE_B]).subscribe();
        await vi.advanceTimersByTimeAsync(400);

        expect(syncService.sync).toHaveBeenCalledTimes(2);
        expect(syncService.sync).toHaveBeenLastCalledWith(
            expect.objectContaining({ eventTypes: expect.arrayContaining([TYPE_A, TYPE_B]) }),
        );

        first.unsubscribe();
        second.unsubscribe();
    });

    it('keeps polling after a failed cycle, keeps emitting, and notifies once per outage', async () => {
        const driver = createDriver();
        syncService.sync
            .mockReturnValueOnce(of(complete(TYPE_A))) // first cycle succeeds → reader paints
            .mockReturnValueOnce(throwError(() => new Error('outage')))
            .mockReturnValueOnce(throwError(() => new Error('outage')))
            .mockReturnValue(of(complete(TYPE_A)));

        const paints: number[] = [];
        const subscription = driver.connect([TYPE_A]).subscribe(() => paints.push(1));

        await vi.advanceTimersByTimeAsync(0);
        const afterFirstPaint = paints.length;
        expect(afterFirstPaint).toBeGreaterThanOrEqual(1);
        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledTimes(0);

        await vi.advanceTimersByTimeAsync(INTERVAL_MS);
        expect(paints.length).toBeGreaterThan(afterFirstPaint);
        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(INTERVAL_MS);
        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledTimes(1);

        const beforeRecovery = paints.length;
        await vi.advanceTimersByTimeAsync(INTERVAL_MS);
        expect(paints.length).toBeGreaterThan(beforeRecovery);

        subscription.unsubscribe();
    });

    it('re-arms the outage notification after going dormant and reactivating', async () => {
        const driver = createDriver();
        syncService.sync.mockReturnValue(throwError(() => new Error('outage')));

        const first = driver.connect([TYPE_A]).subscribe();
        await vi.advanceTimersByTimeAsync(0);
        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledTimes(1);

        first.unsubscribe();
        expect(driver.dormant).toBe(true);

        const second = driver.connect([TYPE_A]).subscribe();
        await vi.advanceTimersByTimeAsync(0);
        expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledTimes(2);

        second.unsubscribe();
    });
});
