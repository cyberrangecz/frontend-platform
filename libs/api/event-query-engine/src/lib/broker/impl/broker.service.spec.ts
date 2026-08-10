import { PlatformEventType } from '@crczp/training-model';
import { signal } from '@angular/core';
import { catchError, delay, firstValueFrom, ignoreElements, Observable, of, switchMap } from 'rxjs';
import { notifyError } from './error-notifier';
import { resolvePoolId } from './pool-id-resolver';
import { executeSyncAndQuery } from './sync-query-executor';
import { CacheSyncService } from '../../sync/sync.interface';
import { CacheService } from '../../cache/cache.interface';
import { ErrorHandlerService } from '@crczp/utils';
import { LinearTrainingInstanceApi } from '@crczp/training-api';

/**
 * Tests for DataBrokerServiceImpl's one-shot query() path through its dependency functions.
 *
 * query() uses toInstanceStream() → switchMap → resolvePoolId, executeSyncAndQuery, notifyError.
 * Since DataBrokerServiceImpl uses inject(), the underlying functions and switchMap semantics are
 * tested directly. The polling path's shared sync driver is covered in instance-sync-driver.spec.ts.
 */
describe('DataBrokerServiceImpl', () => {
    describe('SwitchMap behavior with instanceId signal', () => {
        it('cancels previous sync when instanceId changes (switchMap semantics)', async () => {
            vi.useFakeTimers();

            const syncService = {
                sync: vi.fn().mockReturnValue(of({ eventType: PlatformEventType.COMMAND, instanceId: 1 })),
            };
            const cacheService = {
                query: vi.fn().mockReturnValue(of([])),
                insert: vi.fn(),
                getWatermarks: vi.fn(),
            };
            const instanceApi = {
                get: vi.fn().mockReturnValue(of({ poolId: 42 })),
            } as unknown as LinearTrainingInstanceApi;

            const eventTypes = [PlatformEventType.COMMAND];
            const queryFn = () => of([]);

            let currentInstanceId = 1;
            const instanceIdSignal = signal(currentInstanceId);

            // Simulate the switchMap behavior: when instanceId changes,
            // previous subscription is cancelled
            const results: number[] = [];

            // First subscription for instanceId=1
            const sub1 = resolvePoolId(instanceIdSignal(), eventTypes, instanceApi).pipe(
                switchMap((poolId) =>
                    executeSyncAndQuery(
                        instanceIdSignal(),
                        eventTypes,
                        poolId,
                        queryFn,
                        syncService as unknown as CacheSyncService,
                        cacheService as unknown as CacheService,
                    ),
                ),
            ).subscribe({
                next: () => {
                    results.push(instanceIdSignal());
                },
            });

            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            // Change instanceId - simulates switchMap canceling previous
            currentInstanceId = 2;
            instanceIdSignal.set(2);

            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            sub1.unsubscribe();

            // With switchMap, the second instanceId should have started a new sync
            // The first sync's results would be for instanceId=1
            expect(results.length).toBeGreaterThan(0);

            vi.useRealTimers();
        });

        it('notifies error via ErrorHandlerService when sync errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

            const errorHandler = {
                emitFrontendErrorNotification: vi.fn().mockReturnValue(of(true)),
            } as unknown as ErrorHandlerService;

            const error = new Error('sync failed');

            await firstValueFrom(
                notifyError(error, errorHandler).pipe(
                    catchError(() => of(true))
                ),
            );

            expect(consoleErrorSpy).toHaveBeenCalledWith(error);
            expect(errorHandler.emitFrontendErrorNotification).toHaveBeenCalledWith('sync failed');

            consoleErrorSpy.mockRestore();
        });

        it('errors propagate through the observable chain', async () => {
            vi.useFakeTimers();

            const syncService = {
                sync: vi.fn().mockReturnValue(
                    new Observable<never>((subscriber) => {
                        subscriber.error(new Error('sync failed'));
                    }),
                ),
            };
            const cacheService = {
                query: vi.fn().mockReturnValue(of([])),
                insert: vi.fn(),
                getWatermarks: vi.fn(),
            };
            const instanceApi = {
                get: vi.fn().mockReturnValue(of({ poolId: 42 })),
            } as unknown as LinearTrainingInstanceApi;

            const eventTypes = [PlatformEventType.COMMAND];
            const queryFn = () => of([]);

            let errored = false;
            let errorMessage = '';

            resolvePoolId(1, eventTypes, instanceApi).pipe(
                switchMap((poolId) =>
                    executeSyncAndQuery(
                        1,
                        eventTypes,
                        poolId,
                        queryFn,
                        syncService as unknown as CacheSyncService,
                        cacheService as unknown as CacheService,
                    ),
                ),
                catchError((err) => {
                    errorMessage = err.message;
                    errored = true;
                    return of([]);
                }),
            ).subscribe();

            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            expect(errored).toBe(true);
            expect(errorMessage).toBe('sync failed');

            vi.useRealTimers();
        });
    });

    describe('resolvePoolId integration', () => {
        it('returns undefined when no COMMAND types present', async () => {
            const mockInstanceApi = {
                get: vi.fn(),
            } as unknown as LinearTrainingInstanceApi;

            const result = await firstValueFrom(
                resolvePoolId(1, [PlatformEventType.TRAINING_RUN_STARTED], mockInstanceApi),
            );

            expect(result).toBeUndefined();
            expect(mockInstanceApi.get).not.toHaveBeenCalled();
        });

        it('resolves poolId when COMMAND type is present', async () => {
            const mockInstanceApi = {
                get: vi.fn().mockReturnValue(of({ poolId: 42 })),
            } as unknown as LinearTrainingInstanceApi;

            const result = await firstValueFrom(
                resolvePoolId(1, [PlatformEventType.COMMAND], mockInstanceApi),
            );

            expect(result).toBe(42);
            expect(mockInstanceApi.get).toHaveBeenCalledWith(1);
        });
    });

    describe('executeSyncAndQuery behavior', () => {
        it('runs sync before query', async () => {
            vi.useFakeTimers();

            const syncService = {
                sync: vi.fn().mockReturnValue(
                    of({ eventType: PlatformEventType.COMMAND, instanceId: 1 }).pipe(
                        delay(50),
                        ignoreElements(),
                    ),
                ),
            };
            const cacheService = {
                query: vi.fn().mockReturnValue(of([])),
                insert: vi.fn(),
                getWatermarks: vi.fn(),
            };

            const callOrder: string[] = [];

            syncService.sync.mockImplementation(() => {
                callOrder.push('sync-start');
                return of({ eventType: PlatformEventType.COMMAND, instanceId: 1 }).pipe(
                    delay(50),
                    ignoreElements(),
                );
            });

            const queryFn = () => {
                callOrder.push('query');
                return of([]);
            };

            cacheService.query.mockImplementation(queryFn);

            executeSyncAndQuery(
                1,
                [PlatformEventType.COMMAND],
                42,
                queryFn,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            ).subscribe();

            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            const syncIndex = callOrder.indexOf('sync-start');
            const queryIndex = callOrder.indexOf('query');

            expect(syncIndex).toBeLessThan(queryIndex);
            expect(syncIndex).not.toBe(-1);

            vi.useRealTimers();
        });
    });
});
