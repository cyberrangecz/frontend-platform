import { concat, defer, ignoreElements, Observable } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { CacheService, EventCacheDb } from '../../cache/cache.interface';
import { CacheSyncService } from '../../sync/sync.interface';

export function executeSyncAndQuery<TResult>(
    instanceId: number,
    eventTypes: PlatformEventType[],
    poolId: number | undefined,
    queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    syncService: CacheSyncService,
    cacheService: CacheService,
): Observable<TResult[]> {
    return concat(
        syncService
            .sync({ instanceId, eventTypes, poolId })
            .pipe(ignoreElements()),
        defer(() => cacheService.query(queryFn)),
    );
}
