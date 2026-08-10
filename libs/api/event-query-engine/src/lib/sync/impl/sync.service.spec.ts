import { PlatformEventType } from '@crczp/training-model';
import { TestBed } from '@angular/core/testing';
import { delay, from, lastValueFrom, mergeMap, of, throwError, toArray } from 'rxjs';
import { syncSingleType } from './single-type-sync';
import { SYNC_CONCURRENCY, SyncService } from './sync.service';
import { CacheService, WatermarkEntry } from '../../cache/cache.interface';
import { EventFetchApi } from '../event-fetch-api';
import { SyncTableComplete } from '../sync-result.interface';

/**
 * Replicates the watermark map building logic from SyncService.sync()
 */
function buildWatermarkMap(watermarks: WatermarkEntry[]): Map<string, WatermarkEntry> {
    return new Map(watermarks.map((w) => [w.eventType, w]));
}

describe('SyncService', () => {
    let fetchApi: {
        fetch: ReturnType<typeof vi.fn>;
    };
    let cacheService: {
        insert: ReturnType<typeof vi.fn>;
        getWatermarks: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        fetchApi = {
            fetch: vi.fn(),
        };
        cacheService = {
            insert: vi.fn(),
            getWatermarks: vi.fn(),
        };
    });

    function createWatermark(
        instanceId: number,
        eventType: string,
        maxTimestamp: number,
        lastSynced: number,
    ): WatermarkEntry {
        return { instanceId, eventType, maxTimestamp, lastSynced };
    }

    describe('sync orchestration (SyncService.sync behavior)', () => {
        it('emits one SyncTableComplete for single event type', async () => {
            vi.useFakeTimers();

            const instanceId = 1;
            const eventTypes = [PlatformEventType.TRAINING_RUN_STARTED];
            const watermarks: WatermarkEntry[] = [
                createWatermark(instanceId, PlatformEventType.TRAINING_RUN_STARTED, 0, Date.now() - 5000),
            ];

            fetchApi.fetch.mockReturnValue(of([]));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];

            // Simulate SyncService.sync() orchestration:
            // 1. getWatermarks -> watermarkMap
            // 2. from(eventTypes).pipe(mergeMap(syncSingleType, SYNC_CONCURRENCY))
            const watermarkMap = buildWatermarkMap(watermarks);

            from(eventTypes).pipe(
                mergeMap(
                    (eventType) =>
                        syncSingleType(
                            eventType,
                            instanceId,
                            undefined,
                            watermarkMap.get(eventType),
                            fetchApi as unknown as EventFetchApi,
                            cacheService as unknown as CacheService,
                        ),
                    SYNC_CONCURRENCY,
                ),
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.length).toBe(1);
            expect(results[0]).toEqual({ eventType: PlatformEventType.TRAINING_RUN_STARTED, instanceId });

            vi.useRealTimers();
        });

        it('emits one SyncTableComplete per event type regardless of completion order (parallel path)', async () => {
            vi.useFakeTimers();

            const instanceId = 1;
            const eventTypes = [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.COMMAND];
            const watermarks: WatermarkEntry[] = [
                createWatermark(instanceId, PlatformEventType.TRAINING_RUN_STARTED, 0, Date.now() - 5000),
                createWatermark(instanceId, PlatformEventType.COMMAND, 0, Date.now() - 5000),
            ];

            fetchApi.fetch.mockReturnValue(of([]));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];

            const watermarkMap = buildWatermarkMap(watermarks);

            from(eventTypes).pipe(
                mergeMap(
                    (eventType) =>
                        syncSingleType(
                            eventType,
                            instanceId,
                            42, // poolId for COMMAND
                            watermarkMap.get(eventType),
                            fetchApi as unknown as EventFetchApi,
                            cacheService as unknown as CacheService,
                        ),
                    SYNC_CONCURRENCY,
                ),
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.map((r) => r.eventType).sort()).toEqual(
                [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.COMMAND].sort(),
            );
            expect(results.every((r) => r.instanceId === instanceId)).toBe(true);

            vi.useRealTimers();
        });

        it('dispatches type fetches concurrently rather than awaiting each in turn (parallel path)', async () => {
            vi.useFakeTimers();

            const instanceId = 1;
            const eventTypes = [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.COMMAND];
            const watermarks: WatermarkEntry[] = [
                createWatermark(instanceId, PlatformEventType.TRAINING_RUN_STARTED, 0, Date.now() - 5000),
                createWatermark(instanceId, PlatformEventType.COMMAND, 0, Date.now() - 5000),
            ];

            // Fetches resolve only after a delay, so a sequential operator would invoke just the
            // first before any completes; a concurrent one invokes both up front.
            fetchApi.fetch.mockReturnValue(of([]).pipe(delay(1000)));
            cacheService.insert.mockReturnValue(of(undefined));

            const watermarkMap = buildWatermarkMap(watermarks);

            from(eventTypes).pipe(
                mergeMap(
                    (eventType) =>
                        syncSingleType(
                            eventType,
                            instanceId,
                            42,
                            watermarkMap.get(eventType),
                            fetchApi as unknown as EventFetchApi,
                            cacheService as unknown as CacheService,
                        ),
                    SYNC_CONCURRENCY,
                ),
            ).subscribe();

            // Before any fetch completes, both have already been dispatched.
            expect(fetchApi.fetch).toHaveBeenCalledTimes(eventTypes.length);

            await vi.runAllTimersAsync();
            vi.useRealTimers();
        });

        it('errors the stream when one type fails (parallel path)', async () => {
            vi.useFakeTimers();

            const instanceId = 1;
            const eventTypes = [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.COMMAND];
            const watermarks: WatermarkEntry[] = [
                createWatermark(instanceId, PlatformEventType.TRAINING_RUN_STARTED, 0, Date.now() - 5000),
                createWatermark(instanceId, PlatformEventType.COMMAND, 0, Date.now() - 5000),
            ];

            fetchApi.fetch
                .mockReturnValueOnce(of([]))
                .mockReturnValueOnce(throwError(() => new Error('Fetch failed')));

            cacheService.insert.mockReturnValue(of(undefined));

            let errored = false;
            let errorMessage = '';

            const watermarkMap = buildWatermarkMap(watermarks);

            from(eventTypes).pipe(
                mergeMap(
                    (eventType) =>
                        syncSingleType(
                            eventType,
                            instanceId,
                            42,
                            watermarkMap.get(eventType),
                            fetchApi as unknown as EventFetchApi,
                            cacheService as unknown as CacheService,
                        ),
                    SYNC_CONCURRENCY,
                ),
            ).subscribe({
                error: (err) => {
                    errored = true;
                    errorMessage = err.message;
                },
            });

            await vi.runAllTimersAsync();

            expect(errored).toBe(true);
            expect(errorMessage).toBe('Fetch failed');

            vi.useRealTimers();
        });

        it('builds watermark map correctly from cacheService.getWatermarks result', async () => {
            vi.useFakeTimers();

            const instanceId = 1;
            const watermarkEntries: WatermarkEntry[] = [
                createWatermark(instanceId, PlatformEventType.TRAINING_RUN_STARTED, 500, Date.now()),
                createWatermark(instanceId, PlatformEventType.COMMAND, 300, Date.now()),
            ];

            // Simulate getWatermarks returning data
            cacheService.getWatermarks.mockReturnValue(of(watermarkEntries));

            let result: WatermarkEntry[] = [];
            cacheService.getWatermarks(instanceId, [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.COMMAND])
                .subscribe((watermarks) => {
                    result = watermarks;
                });

            await vi.runAllTimersAsync();

            const watermarkMap = buildWatermarkMap(result);

            expect(watermarkMap.get(PlatformEventType.TRAINING_RUN_STARTED)?.maxTimestamp).toBe(500);
            expect(watermarkMap.get(PlatformEventType.COMMAND)?.maxTimestamp).toBe(300);

            vi.useRealTimers();
        });

        it('skips fetch when watermark is fresh (within 1 second)', async () => {
            vi.useFakeTimers();

            const instanceId = 1;
            const eventType = PlatformEventType.TRAINING_RUN_STARTED;
            const now = Date.now();

            // Fresh watermark: lastSynced within 1 second
            const freshWatermark = createWatermark(instanceId, eventType, now - 500, now - 500);

            fetchApi.fetch.mockReturnValue(of([]));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];

            syncSingleType(
                eventType,
                instanceId,
                undefined,
                freshWatermark,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            // Should emit complete without fetching
            expect(results.length).toBe(1);
            expect(results[0]).toEqual({ eventType, instanceId });
            expect(fetchApi.fetch).not.toHaveBeenCalled();
            expect(cacheService.insert).not.toHaveBeenCalled();

            vi.useRealTimers();
        });
    });

    describe('production wiring (SyncService.sync via DI)', () => {
        it('dispatches type fetches concurrently through the production mergeMap', async () => {
            vi.useFakeTimers();

            const fetch = vi.fn().mockReturnValue(of([]).pipe(delay(1000)));
            const cache = {
                getWatermarks: vi.fn().mockReturnValue(of([])),
                insert: vi.fn().mockReturnValue(of(undefined)),
            };

            TestBed.configureTestingModule({
                providers: [
                    SyncService,
                    { provide: CacheService, useValue: cache },
                    { provide: EventFetchApi, useValue: { fetch } },
                ],
            });

            const subscription = TestBed.inject(SyncService)
                .sync({
                    instanceId: 1,
                    eventTypes: [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.LEVEL_STARTED],
                })
                .subscribe();

            // Both fetches are dispatched before either delayed fetch resolves; a sequential
            // operator would have invoked only the first.
            expect(fetch).toHaveBeenCalledTimes(2);

            subscription.unsubscribe();
            vi.useRealTimers();
        });
    });

    describe('SyncService.sync — declared behavior via DI', () => {
        function provideSyncService(
            getWatermarks: ReturnType<typeof vi.fn>,
            fetch: ReturnType<typeof vi.fn>,
        ): SyncService {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    SyncService,
                    {
                        provide: CacheService,
                        useValue: { getWatermarks, insert: vi.fn().mockReturnValue(of(undefined)) },
                    },
                    { provide: EventFetchApi, useValue: { fetch } },
                ],
            });
            return TestBed.inject(SyncService);
        }

        it('exports SYNC_CONCURRENCY equal to 8', () => {
            expect(SYNC_CONCURRENCY).toBe(8);
        });

        it('emits one SyncTableComplete per event type, then completes', async () => {
            const instanceId = 3;
            const eventTypes = [PlatformEventType.LEVEL_STARTED, PlatformEventType.HINT_TAKEN];
            const fetch = vi.fn().mockReturnValue(of([]));
            const service = provideSyncService(vi.fn().mockReturnValue(of([])), fetch);

            const emissions = await lastValueFrom(service.sync({ instanceId, eventTypes }).pipe(toArray()));

            expect(emissions).toHaveLength(eventTypes.length);
            expect(emissions.map((e) => e.eventType).sort()).toEqual([...eventTypes].sort());
            emissions.forEach((e) => expect(e.instanceId).toBe(instanceId));
        });

        it('emits one per type with no fetch when all watermarks are fresh', async () => {
            const instanceId = 3;
            const eventTypes = [PlatformEventType.LEVEL_STARTED, PlatformEventType.HINT_TAKEN];
            const fresh = eventTypes.map((eventType) => ({
                instanceId,
                eventType,
                maxTimestamp: 0,
                lastSynced: Date.now(),
            }));
            const fetch = vi.fn().mockReturnValue(of([]));
            const service = provideSyncService(vi.fn().mockReturnValue(of(fresh)), fetch);

            const emissions = await lastValueFrom(service.sync({ instanceId, eventTypes }).pipe(toArray()));

            expect(emissions).toHaveLength(eventTypes.length);
            expect(fetch).not.toHaveBeenCalled();
        });

        it('completes with no emissions for an empty eventTypes array', async () => {
            const service = provideSyncService(vi.fn().mockReturnValue(of([])), vi.fn().mockReturnValue(of([])));

            const emissions = await lastValueFrom(
                service.sync({ instanceId: 3, eventTypes: [] }).pipe(toArray()),
            );

            expect(emissions).toEqual([]);
        });

        it('errors immediately for a COMMAND type without poolId', async () => {
            const service = provideSyncService(vi.fn().mockReturnValue(of([])), vi.fn().mockReturnValue(of([])));

            await expect(
                lastValueFrom(
                    service.sync({ instanceId: 3, eventTypes: [PlatformEventType.COMMAND] }).pipe(toArray()),
                ),
            ).rejects.toBeInstanceOf(Error);
        });
    });
});
