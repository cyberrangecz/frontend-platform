import { inject, Injectable, Injector, Signal } from '@angular/core';
import { catchError, Observable, switchMap } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { ErrorHandlerService } from '@crczp/utils';
import { CacheService, EventCacheDb } from '../../cache/cache.interface';
import { CacheSyncService } from '../../sync/sync.interface';
import { DataBrokerService } from '../broker.interface';
import { executeSyncAndQuery } from './sync-query-executor';
import { SyncDriverRegistry } from './sync-driver-registry';
import { notifyError } from './error-notifier';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable()
export class DataBrokerServiceImpl implements DataBrokerService {
    private readonly injector = inject(Injector);
    private readonly syncService = inject(CacheSyncService);
    private readonly cacheService = inject(CacheService);
    private readonly errorHandler = inject(ErrorHandlerService);
    private readonly driverRegistry = inject(SyncDriverRegistry);

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
        return executeSyncAndQuery(
            instanceId,
            eventTypes,
            queryFn,
            this.syncService,
            this.cacheService,
        ).pipe(catchError((err) => notifyError(err, this.errorHandler)));
    }

    private scopedPollingQuery<TResult>(
        instanceId: number,
        eventTypes: PlatformEventType[],
        queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    ): Observable<TResult[]> {
        return this.driverRegistry.connect(instanceId, eventTypes).pipe(
            switchMap(() => this.cacheService.query(queryFn)),
        );
    }
}
