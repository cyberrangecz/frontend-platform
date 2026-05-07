import { PlatformEventType } from '@crczp/visualization-model';
import { concatMap, from, of, throwError } from 'rxjs';
import { syncSingleType } from './single-type-sync';
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

    describe('buildWatermarkMap', () => {
        it('correctly maps event types to watermark entries', () => {
            const watermarks: WatermarkEntry[] = [
                createWatermark(1, PlatformEventType.TRAINING_RUN_STARTED, 100, Date.now()),
                createWatermark(1, PlatformEventType.COMMAND, 200, Date.now()),
            ];

            const watermarkMap = buildWatermarkMap(watermarks);

            expect(watermarkMap.size).toBe(2);
            expect(watermarkMap.get(PlatformEventType.TRAINING_RUN_STARTED)?.maxTimestamp).toBe(100);
            expect(watermarkMap.get(PlatformEventType.COMMAND)?.maxTimestamp).toBe(200);
        });

        it('handles empty watermark array', () => {
            const watermarkMap = buildWatermarkMap([]);
            expect(watermarkMap.size).toBe(0);
        });

        it('last watermark entry wins for duplicate event types', () => {
            const watermarks: WatermarkEntry[] = [
                createWatermark(1, PlatformEventType.COMMAND, 100, Date.now()),
                createWatermark(1, PlatformEventType.COMMAND, 200, Date.now()),
            ];

            const watermarkMap = buildWatermarkMap(watermarks);

            expect(watermarkMap.get(PlatformEventType.COMMAND)?.maxTimestamp).toBe(200);
        });
    });

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
            // 2. from(eventTypes).pipe(concatMap(syncSingleType))
            const watermarkMap = buildWatermarkMap(watermarks);

            from(eventTypes).pipe(
                concatMap((eventType) =>
                    syncSingleType(
                        eventType,
                        instanceId,
                        undefined,
                        watermarkMap.get(eventType),
                        fetchApi as unknown as EventFetchApi,
                        cacheService as unknown as CacheService,
                    ),
                ),
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.length).toBe(1);
            expect(results[0]).toEqual({ eventType: PlatformEventType.TRAINING_RUN_STARTED, instanceId });

            vi.useRealTimers();
        });

        it('emits in declaration order for multiple event types (concatMap semantics)', async () => {
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

            // Simulate SyncService.sync() with multiple types
            from(eventTypes).pipe(
                concatMap((eventType) =>
                    syncSingleType(
                        eventType,
                        instanceId,
                        42, // poolId for COMMAND
                        watermarkMap.get(eventType),
                        fetchApi as unknown as EventFetchApi,
                        cacheService as unknown as CacheService,
                    ),
                ),
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.length).toBe(2);
            expect(results[0].eventType).toBe(PlatformEventType.TRAINING_RUN_STARTED);
            expect(results[1].eventType).toBe(PlatformEventType.COMMAND);

            vi.useRealTimers();
        });

        it('errors stream when one type fails, remaining types not processed', async () => {
            vi.useFakeTimers();

            const instanceId = 1;
            const eventTypes = [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.COMMAND];
            const watermarks: WatermarkEntry[] = [
                createWatermark(instanceId, PlatformEventType.TRAINING_RUN_STARTED, 0, Date.now() - 5000),
                createWatermark(instanceId, PlatformEventType.COMMAND, 0, Date.now() - 5000),
            ];

            // First fetch succeeds, second fetch errors
            fetchApi.fetch
                .mockReturnValueOnce(of([]))
                .mockReturnValueOnce(throwError(() => new Error('Fetch failed')));

            cacheService.insert.mockReturnValue(of(undefined));

            let errored = false;
            let errorMessage = '';

            const watermarkMap = buildWatermarkMap(watermarks);

            from(eventTypes).pipe(
                concatMap((eventType) =>
                    syncSingleType(
                        eventType,
                        instanceId,
                        42,
                        watermarkMap.get(eventType),
                        fetchApi as unknown as EventFetchApi,
                        cacheService as unknown as CacheService,
                    ),
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
            // With concatMap, first type completes before second starts
            // Error occurs when second type's fetch is called
            expect(fetchApi.fetch).toHaveBeenCalledTimes(2);

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
});
