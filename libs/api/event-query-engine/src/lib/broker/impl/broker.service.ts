import { inject, Injectable, Injector, Signal } from '@angular/core';
import { catchError, Observable, switchMap } from 'rxjs';
import { PlatformEventType } from '@crczp/visualization-model';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { LinearTrainingInstanceApi } from '@crczp/training-api';
import { PgliteCacheService } from '../../cache/impl/pglite-cache.service';
import { EventCacheDb } from '../../cache/cache.interface';
import { CacheSyncService } from '../../sync/sync.interface';
import { DataBrokerService } from '../broker.interface';
import { resolvePoolId } from './pool-id-resolver';
import { executeSyncAndQuery } from './sync-query-executor';
import { pollingLoop } from './polling-loop';
import { notifyError } from './error-notifier';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class DataBrokerServiceImpl implements DataBrokerService {
    private readonly injector = inject(Injector);
    private readonly syncService = inject(CacheSyncService);
    private readonly cacheService = inject(PgliteCacheService);
    private readonly instanceApi = inject(LinearTrainingInstanceApi);
    private readonly errorHandler = inject(ErrorHandlerService);
    private readonly intervalMs =
        inject(PortalConfig).polling.pollingPeriodShort;

    private toInstanceStream(
        instanceId: Signal<number>,
        injector: Injector,
    ): Observable<number> {
        return toObservable(instanceId, { injector });
    }

    query<TResult>(
        instanceId: Signal<number>,
        eventTypes: PlatformEventType[],
        queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    ): Observable<TResult[]> {
        return this.toInstanceStream(instanceId, this.injector).pipe(
            switchMap((id) => this.scopedQuery(id, eventTypes, queryFn)),
        );
    }

    queryPolling<TResult>(
        instanceId: Signal<number>,
        eventTypes: PlatformEventType[],
        queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    ): Observable<TResult[]> {
        return this.toInstanceStream(instanceId, this.injector).pipe(
            switchMap((id) => this.scopedPollingQuery(id, eventTypes, queryFn)),
        );
    }

    private scopedQuery<TResult>(
        instanceId: number,
        eventTypes: PlatformEventType[],
        queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    ): Observable<TResult[]> {
        return resolvePoolId(instanceId, eventTypes, this.instanceApi).pipe(
            switchMap((poolId) =>
                executeSyncAndQuery(
                    instanceId,
                    eventTypes,
                    poolId,
                    queryFn,
                    this.syncService,
                    this.cacheService,
                ),
            ),
            catchError((err) => notifyError(err, this.errorHandler)),
        );
    }

    private scopedPollingQuery<TResult>(
        instanceId: number,
        eventTypes: PlatformEventType[],
        queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    ): Observable<TResult[]> {
        return resolvePoolId(instanceId, eventTypes, this.instanceApi).pipe(
            switchMap((poolId) =>
                pollingLoop(
                    instanceId,
                    eventTypes,
                    poolId,
                    queryFn,
                    this.intervalMs,
                    this.syncService,
                    this.cacheService,
                ),
            ),
            catchError((err) => notifyError(err, this.errorHandler)),
        );
    }
}
