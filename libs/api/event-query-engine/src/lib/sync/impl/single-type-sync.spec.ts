import { Observable, of } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { syncSingleType } from './single-type-sync';
import {
    CacheService,
    RawEventRow,
    WatermarkEntry,
} from '../../cache/cache.interface';
import { EventFetchApi } from '../event-fetch-api';
import { SyncTableComplete } from '../sync-result.interface';

describe('syncSingleType', () => {
    let fetchApi: {
        fetch: ReturnType<typeof vi.fn>;
    };
    let cacheService: {
        insert: ReturnType<typeof vi.fn>;
        getWatermarks: ReturnType<typeof vi.fn>;
    };

    const eventType = PlatformEventType.COMMAND;
    const instanceId = 1;
    const poolId = 42;

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

    function createFetchResult(rows: RawEventRow[]): Observable<RawEventRow[]> {
        return of(rows);
    }

    describe('watermark freshness', () => {
        it('emits SyncTableComplete immediately when watermark is fresh (within 1s)', async () => {
            vi.useFakeTimers();

            const now = Date.now();
            const freshWatermark = createWatermark(
                instanceId,
                `${eventType}`,
                now - 500,
                now - 500,
            );

            const results: SyncTableComplete[] = [];
            syncSingleType(
                eventType,
                instanceId,
                poolId,
                freshWatermark,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.length).toBe(1);
            expect(results[0]).toEqual({ eventType, instanceId });
            expect(fetchApi.fetch).not.toHaveBeenCalled();
            expect(cacheService.insert).not.toHaveBeenCalled();

            vi.useRealTimers();
        });

        it('fetches and inserts when watermark is stale (older than 1s)', async () => {
            vi.useFakeTimers();

            const now = Date.now();
            const staleWatermark = createWatermark(
                instanceId,
                `${eventType}`,
                now - 5000,
                now - 5000,
            );
            const fetchedRows: RawEventRow[] = [
                {
                    id: '1',
                    type: 'Command',
                    timestamp: 1234567890,
                    instance_id: instanceId,
                    sandbox_id: 'sb-1',
                },
            ];

            fetchApi.fetch.mockReturnValue(createFetchResult(fetchedRows));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];
            syncSingleType(
                eventType,
                instanceId,
                poolId,
                staleWatermark,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(fetchApi.fetch).toHaveBeenCalled();
            expect(cacheService.insert).toHaveBeenCalledWith(fetchedRows);
            expect(results.length).toBe(1);
            expect(results[0]).toEqual({ eventType, instanceId });

            vi.useRealTimers();
        });

        it('fetches with sinceTimestamp=0 when no watermark exists', async () => {
            vi.useFakeTimers();

            const fetchedRows: RawEventRow[] = [];
            fetchApi.fetch.mockReturnValue(createFetchResult(fetchedRows));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];
            syncSingleType(
                eventType,
                instanceId,
                poolId,
                undefined,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(fetchApi.fetch).toHaveBeenCalledWith(
                expect.objectContaining({
                    instanceId,
                    eventType,
                    sinceTimestamp: 0,
                    poolId,
                }),
            );
            expect(cacheService.insert).toHaveBeenCalled();
            expect(results.length).toBe(1);

            vi.useRealTimers();
        });
    });

    describe('poolId validation', () => {
        it('throws error for COMMAND type when poolId is undefined', async () => {
            vi.useFakeTimers();

            const results: unknown[] = [];
            let errored = false;

            syncSingleType(
                PlatformEventType.COMMAND,
                instanceId,
                undefined, // no poolId
                undefined,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe({
                next: (r) => results.push(r),
                error: (err) => {
                    errored = true;
                    expect(err).toBeInstanceOf(Error);
                    expect((err as Error).message).toContain('poolId required');
                },
                complete: () => undefined,
            });

            await vi.runAllTimersAsync();

            expect(errored).toBe(true);
            expect(fetchApi.fetch).not.toHaveBeenCalled();

            vi.useRealTimers();
        });

        it('does not throw for non-COMMAND type when poolId is undefined', async () => {
            vi.useFakeTimers();

            fetchApi.fetch.mockReturnValue(of([]));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];
            let errored = false;

            // Use a non-COMMAND event type
            syncSingleType(
                PlatformEventType.TRAINING_RUN_STARTED, // instance-scoped, no poolId required
                instanceId,
                undefined,
                undefined,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe({
                next: (r) => results.push(r),
                error: () => {
                    errored = true;
                },
            });

            await vi.runAllTimersAsync();

            expect(errored).toBe(false);
            expect(fetchApi.fetch).toHaveBeenCalled();

            vi.useRealTimers();
        });

        it('works fine with poolId provided for COMMAND type', async () => {
            vi.useFakeTimers();

            fetchApi.fetch.mockReturnValue(of([]));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];
            let errored = false;

            syncSingleType(
                PlatformEventType.COMMAND,
                instanceId,
                poolId,
                undefined,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe({
                next: (r) => results.push(r),
                error: () => {
                    errored = true;
                },
            });

            await vi.runAllTimersAsync();

            expect(errored).toBe(false);
            expect(fetchApi.fetch).toHaveBeenCalled();

            vi.useRealTimers();
        });
    });

    describe('empty fetch result', () => {
        it('still emits SyncTableComplete when fetch returns no events', async () => {
            vi.useFakeTimers();

            const staleWatermark = createWatermark(
                instanceId,
                `${eventType}`,
                Date.now() - 5000,
                Date.now() - 5000,
            );

            fetchApi.fetch.mockReturnValue(of([]));
            cacheService.insert.mockReturnValue(of(undefined));

            const results: SyncTableComplete[] = [];
            syncSingleType(
                eventType,
                instanceId,
                poolId,
                staleWatermark,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(fetchApi.fetch).toHaveBeenCalled();
            expect(cacheService.insert).toHaveBeenCalledWith([]);
            expect(results.length).toBe(1);
            expect(results[0]).toEqual({ eventType, instanceId });

            vi.useRealTimers();
        });
    });

    describe('sinceTimestamp calculation', () => {
        it('fetches with a sinceTimestamp within [0, maxTimestamp] so boundary events overlap', async () => {
            vi.useFakeTimers();

            const maxTimestamp = 1000000;
            const staleWatermark = createWatermark(
                instanceId,
                `${eventType}`,
                maxTimestamp,
                Date.now() - 5000,
            );

            fetchApi.fetch.mockReturnValue(of([]));
            cacheService.insert.mockReturnValue(of(undefined));

            syncSingleType(
                eventType,
                instanceId,
                poolId,
                staleWatermark,
                fetchApi as unknown as EventFetchApi,
                cacheService as unknown as CacheService,
            ).subscribe();

            await vi.runAllTimersAsync();

            const fetchArg = fetchApi.fetch.mock.calls[0][0] as { sinceTimestamp: number };
            expect(fetchArg.sinceTimestamp).toBeGreaterThanOrEqual(0);
            expect(fetchArg.sinceTimestamp).toBeLessThanOrEqual(maxTimestamp);

            vi.useRealTimers();
        });
    });
});
