import { Observable, exhaustMap, timer } from 'rxjs';
import { PlatformEventType } from '@crczp/visualization-model';
import { EventCacheDb, SqliteCacheService } from '../../cache/cache.interface';
import { CacheSyncService } from '../../sync/sync.interface';
import { executeSyncAndQuery } from './sync-query-executor';

export function pollingLoop<TResult>(
    instanceId: number,
    eventTypes: PlatformEventType[],
    poolId: number | undefined,
    queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    intervalMs: number,
    syncService: CacheSyncService,
    cacheService: SqliteCacheService,
): Observable<TResult[]> {
    return timer(0, intervalMs).pipe(
        exhaustMap(() =>
            executeSyncAndQuery(instanceId, eventTypes, poolId, queryFn, syncService, cacheService),
        ),
    );
}
