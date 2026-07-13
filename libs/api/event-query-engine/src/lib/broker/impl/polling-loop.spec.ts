import { delay, ignoreElements, Observable, of, take } from 'rxjs';
import { PlatformEventType } from '@crczp/visualization-model';
import { pollingLoop } from './polling-loop';
import { CacheSyncService } from '../../sync/sync.interface';
import {
    CacheService,
    EventCacheDb,
    RawEventRow,
} from '../../cache/cache.interface';

describe('pollingLoop', () => {
    let syncService: {
        sync: ReturnType<typeof vi.fn>;
    };
    let cacheService: {
        query: ReturnType<typeof vi.fn>;
        insert: ReturnType<typeof vi.fn>;
        getWatermarks: ReturnType<typeof vi.fn>;
    };
    let queryFn: (db: EventCacheDb) => Observable<RawEventRow[]>;

    const instanceId = 1;
    const eventTypes = [PlatformEventType.COMMAND];
    const poolId = 42;
    const intervalMs = 500;

    beforeEach(() => {
        syncService = {
            sync: vi.fn(),
        };
        cacheService = {
            query: vi.fn(),
            insert: vi.fn(),
            getWatermarks: vi.fn(),
        };
        queryFn = vi.fn(() => of([]));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('timing behavior', () => {
        it('emits immediately on first subscription (timer 0 behavior)', async () => {
            vi.useFakeTimers();

            syncService.sync.mockReturnValue(
                of({ eventType: PlatformEventType.COMMAND, instanceId }).pipe(
                    ignoreElements(),
                ),
            );
            cacheService.query.mockReturnValue(of([]));

            const results: RawEventRow[][] = [];
            pollingLoop(
                instanceId,
                eventTypes,
                poolId,
                queryFn,
                intervalMs,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            )
                .pipe(take(1))
                .subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.length).toBe(1);
            expect(results[0]).toEqual([]);

            vi.useRealTimers();
        });

        it('repeats at intervalMs intervals', async () => {
            vi.useFakeTimers();

            syncService.sync.mockReturnValue(
                of({ eventType: PlatformEventType.COMMAND, instanceId }).pipe(
                    ignoreElements(),
                ),
            );
            cacheService.query.mockReturnValue(of([]));

            const results: RawEventRow[][] = [];
            pollingLoop(
                instanceId,
                eventTypes,
                poolId,
                queryFn,
                intervalMs,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            )
                .pipe(take(2))
                .subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.length).toBe(2);
        });
    });

    describe('exhaustMap behavior', () => {
        it('skips ticks when previous sync is still running', async () => {
            vi.useFakeTimers();

            // Sync takes 200ms - longer than the 100ms interval
            syncService.sync.mockReturnValue(
                of({ eventType: PlatformEventType.COMMAND, instanceId }).pipe(
                    delay(200),
                ),
            );
            cacheService.query.mockReturnValue(of([]));

            const results: RawEventRow[][] = [];
            const syncCalls: number[] = [];

            syncService.sync.mockImplementation(() => {
                syncCalls.push(Date.now());
                return of({
                    eventType: PlatformEventType.COMMAND,
                    instanceId,
                }).pipe(delay(200));
            });
            cacheService.query.mockReturnValue(of([]));

            pollingLoop(
                instanceId,
                eventTypes,
                poolId,
                queryFn,
                100, // 100ms interval
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            )
                .pipe(take(2))
                .subscribe((r) => results.push(r));

            // Advance enough for first sync (200ms delay) to complete + second cycle
            vi.advanceTimersByTime(400);
            await vi.runAllTimersAsync();

            // exhaustMap should skip the 100ms tick while first sync is running
            expect(syncCalls.length).toBeLessThanOrEqual(2);
        });

        it('allows next cycle after previous sync completes', async () => {
            vi.useFakeTimers();

            syncService.sync.mockReturnValue(
                of({ eventType: PlatformEventType.COMMAND, instanceId }).pipe(
                    ignoreElements(),
                ),
            );
            cacheService.query.mockReturnValue(of([]));

            const results: RawEventRow[][] = [];
            pollingLoop(
                instanceId,
                eventTypes,
                poolId,
                queryFn,
                100,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            )
                .pipe(take(2))
                .subscribe((r) => results.push(r));

            await vi.runAllTimersAsync();

            expect(results.length).toBe(2);
        });
    });

    describe('sync and query order', () => {
        it('runs sync before query in each cycle', async () => {
            vi.useFakeTimers();

            const callOrder: string[] = [];

            syncService.sync.mockImplementation(() => {
                callOrder.push('sync-start');
                return of({
                    eventType: PlatformEventType.COMMAND,
                    instanceId,
                }).pipe(delay(50), ignoreElements());
            });

            queryFn = vi.fn(() => {
                callOrder.push('query');
                return of([]);
            });

            cacheService.query.mockImplementation(queryFn);

            pollingLoop(
                instanceId,
                eventTypes,
                poolId,
                queryFn,
                100,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            )
                .pipe(take(1))
                .subscribe();

            await vi.runAllTimersAsync();

            const syncIndex = callOrder.indexOf('sync-start');
            const queryIndex = callOrder.indexOf('query');

            expect(syncIndex).toBeLessThan(queryIndex);
            expect(syncIndex).not.toBe(-1);
            expect(queryIndex).not.toBe(-1);
        });
    });

    describe('error handling', () => {
        it('errors the observable when sync errors', async () => {
            vi.useFakeTimers();

            syncService.sync.mockReturnValue(
                new Observable<never>((subscriber) => {
                    subscriber.error(new Error('sync failed'));
                }),
            );
            cacheService.query.mockReturnValue(of([]));

            let errored = false;
            pollingLoop(
                instanceId,
                eventTypes,
                poolId,
                queryFn,
                intervalMs,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            ).subscribe({
                error: () => {
                    errored = true;
                },
            });

            await vi.runAllTimersAsync();

            expect(errored).toBe(true);
        });
    });
});
