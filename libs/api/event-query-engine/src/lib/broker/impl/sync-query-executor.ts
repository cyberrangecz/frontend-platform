import { Observable, concat, defer, ignoreElements } from 'rxjs';
import { PlatformEventType } from '@crczp/visualization-model';
import { EventCacheDb, SqliteCacheService } from '../../cache/cache.interface';
import { CacheSyncService } from '../../sync/sync.interface';

export function executeSyncAndQuery<TResult>(
    instanceId: number,
    eventTypes: PlatformEventType[],
    poolId: number | undefined,
    queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    syncService: CacheSyncService,
    cacheService: SqliteCacheService,
): Observable<TResult[]> {
    return concat(
        syncService.sync({ instanceId, eventTypes, poolId }).pipe(ignoreElements()),
        defer(() => cacheService.query(queryFn)),
    );
}
