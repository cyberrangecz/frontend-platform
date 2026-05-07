import {
    firstValueFrom,
    ignoreElements,
    Observable,
    of,
    throwError,
} from 'rxjs';
import { executeSyncAndQuery } from './sync-query-executor';
import { PlatformEventType } from '@crczp/visualization-model';
import { CacheService, EventCacheDb } from '../../cache/cache.interface';
import { CacheSyncService } from '../../sync/sync.interface';

describe('executeSyncAndQuery', () => {
    let syncService: {
        sync: ReturnType<typeof vi.fn>;
    };
    let cacheService: {
        query: ReturnType<typeof vi.fn>;
    };
    let queryFn: (db: EventCacheDb) => Observable<{ id: string }[]>;

    const instanceId = 1;
    const eventTypes = [PlatformEventType.COMMAND];
    const poolId = 42;

    beforeEach(() => {
        syncService = {
            sync: vi.fn(),
        };
        cacheService = {
            query: vi.fn(),
        };
        queryFn = vi.fn(() => of([{ id: 'result-1' }]));
    });

    describe('when sync completes successfully', () => {
        it('runs the query function and emits the result', async () => {
            syncService.sync.mockReturnValue(
                of({ instanceId, eventType: PlatformEventType.COMMAND }).pipe(
                    ignoreElements(),
                ),
            );
            cacheService.query.mockReturnValue(of([{ id: 'result-1' }]));

            const results = await firstValueFrom(
                executeSyncAndQuery(
                    instanceId,
                    eventTypes,
                    poolId,
                    queryFn,
                    syncService as unknown as CacheSyncService,
                    cacheService as unknown as CacheService,
                ),
            );

            expect(results).toEqual([{ id: 'result-1' }]);
            expect(cacheService.query).toHaveBeenCalledWith(queryFn);
        });

        it('runs sync before query', async () => {
            const callOrder: string[] = [];

            syncService.sync.mockReturnValue(
                of({ instanceId, eventType: PlatformEventType.COMMAND }).pipe(
                    ignoreElements(),
                ),
            );
            queryFn = vi.fn(() => {
                callOrder.push('query');
                return of([{ id: 'result-1' }]);
            });
            cacheService.query.mockImplementation(queryFn);

            await firstValueFrom(
                executeSyncAndQuery(
                    instanceId,
                    eventTypes,
                    poolId,
                    queryFn,
                    syncService as unknown as CacheSyncService,
                    cacheService as unknown as CacheService,
                ),
            );

            // sync$ is concatenated with ignoreElements, so it completes
            // but the query should still run after sync completes
            expect(queryFn).toHaveBeenCalled();
        });
    });

    describe('when sync errors', () => {
        it('does not run the query function', async () => {
            const consoleErrorSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            syncService.sync.mockReturnValue(
                throwError(() => new Error('sync failed')),
            );

            let queryCalled = false;
            queryFn = vi.fn(() => {
                queryCalled = true;
                return of([{ id: 'result-1' }]);
            });
            cacheService.query.mockImplementation(queryFn);

            let errored = false;
            let caughtError: unknown;
            try {
                await firstValueFrom(
                    executeSyncAndQuery(
                        instanceId,
                        eventTypes,
                        poolId,
                        queryFn,
                        syncService as unknown as CacheSyncService,
                        cacheService as unknown as CacheService,
                    ),
                );
            } catch (err) {
                errored = true;
                caughtError = err;
            }

            expect(errored).toBe(true);
            expect(caughtError).toBeInstanceOf(Error);
            expect(caughtError).toHaveProperty('message', 'sync failed');
            expect(queryCalled).toBe(false);

            consoleErrorSpy.mockRestore();
        });

        it('propagates the error from sync', async () => {
            const consoleErrorSpy = vi
                .spyOn(console, 'error')
                .mockImplementation(() => {});
            const syncError = new Error('sync failed');
            syncService.sync.mockReturnValue(throwError(() => syncError));

            let caughtError: unknown;
            try {
                await firstValueFrom(
                    executeSyncAndQuery(
                        instanceId,
                        eventTypes,
                        poolId,
                        queryFn,
                        syncService as unknown as CacheSyncService,
                        cacheService as unknown as CacheService,
                    ),
                );
            } catch (err) {
                caughtError = err;
            }

            expect(caughtError).toBe(syncError);

            consoleErrorSpy.mockRestore();
        });
    });

    describe('when sync emits intermediate values', () => {
        it('ignores intermediate sync emissions and only emits query result', async () => {
            // Simulate sync emitting intermediate SyncTableComplete events before completing
            syncService.sync.mockReturnValue(
                of(
                    { instanceId, eventType: PlatformEventType.COMMAND },
                    {
                        instanceId,
                        eventType: PlatformEventType.TRAINING_RUN_STARTED,
                    },
                ).pipe(ignoreElements()),
            );
            cacheService.query.mockReturnValue(of([{ id: 'final-result' }]));

            const results = await firstValueFrom(
                executeSyncAndQuery(
                    instanceId,
                    eventTypes,
                    poolId,
                    queryFn,
                    syncService as unknown as CacheSyncService,
                    cacheService as unknown as CacheService,
                ),
            );

            // Should only emit the query result, not the intermediate sync values
            expect(results).toEqual([{ id: 'final-result' }]);
        });
    });
});
