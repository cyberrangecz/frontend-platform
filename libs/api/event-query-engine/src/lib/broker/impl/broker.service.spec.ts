import { PlatformEventType } from '@crczp/training-model';
import { signal } from '@angular/core';
import { catchError, delay, firstValueFrom, ignoreElements, Observable, of } from 'rxjs';
import { notifyError } from './error-notifier';
import { executeSyncAndQuery } from './sync-query-executor';
import { CacheSyncService } from '../../sync/sync.interface';
import { CacheService } from '../../cache/cache.interface';
import { ErrorHandlerService } from '@crczp/utils';

/**
 * Tests for DataBrokerServiceImpl's one-shot query() path through its dependency functions.
 *
 * query() pipes toObservable(instanceId) into executeSyncAndQuery and notifies through notifyError.
 * Since DataBrokerServiceImpl uses inject(), the underlying functions are tested directly; the
 * signal-driven scope switch is covered at DI level in the integration spec, and the polling path's
 * shared sync driver in instance-sync-driver.spec.ts.
 */
describe('DataBrokerServiceImpl', () => {
    describe('query path composition', () => {
        it('syncs and queries the instance id it is given', async () => {
            vi.useFakeTimers();

            const syncService = {
                sync: vi.fn().mockReturnValue(of({ eventType: PlatformEventType.COMMAND, instanceId: 1 })),
            };
            const cacheService = {
                query: vi.fn().mockReturnValue(of([])),
                insert: vi.fn(),
                getWatermarks: vi.fn(),
            };
            const eventTypes = [PlatformEventType.COMMAND];
            const queryFn = () => of([]);

            const instanceIdSignal = signal(1);
            const results: unknown[][] = [];

            const subscription = executeSyncAndQuery(
                instanceIdSignal(),
                eventTypes,
                queryFn,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            ).subscribe((rows) => results.push(rows));

            vi.advanceTimersByTime(100);
            await vi.runAllTimersAsync();

            subscription.unsubscribe();

            expect(syncService.sync).toHaveBeenCalledWith({ instanceId: 1, eventTypes });
            expect(cacheService.query).toHaveBeenCalledWith(queryFn);
            expect(results).toEqual([[]]);

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
            const eventTypes = [PlatformEventType.COMMAND];
            const queryFn = () => of([]);

            let errored = false;
            let errorMessage = '';

            executeSyncAndQuery(
                1,
                eventTypes,
                queryFn,
                syncService as unknown as CacheSyncService,
                cacheService as unknown as CacheService,
            ).pipe(
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
