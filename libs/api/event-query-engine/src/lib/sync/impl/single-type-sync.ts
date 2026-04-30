import { Observable, concat, ignoreElements, of, switchMap, throwError } from 'rxjs';
import { PlatformEventType } from '@crczp/visualization-model';
import { SqliteCacheService, WatermarkEntry } from '../../cache/cache.interface';
import { EventFetchApi } from '../event-fetch-api';
import { SyncTableComplete } from '../sync-result.interface';
import { getSinceTimestamp, isWatermarkFresh } from './watermark-freshness';
import { validatePoolId } from './pool-id-validator';

export function syncSingleType(
    eventType: PlatformEventType,
    instanceId: number,
    poolId: number | undefined,
    watermark: WatermarkEntry | undefined,
    fetchApi: EventFetchApi,
    cacheService: SqliteCacheService,
): Observable<SyncTableComplete> {
    const complete: SyncTableComplete = { eventType, instanceId };

    if (isWatermarkFresh(watermark)) {
        return of(complete);
    }

    try {
        validatePoolId(eventType, poolId);
    } catch (err) {
        return throwError(() => err);
    }

    const sinceTimestamp = getSinceTimestamp(watermark);

    return concat(
        fetchApi.fetch({ instanceId, eventType, sinceTimestamp, poolId }).pipe(
            switchMap((rows) => cacheService.insert(rows)),
            ignoreElements(),
        ),
        of(complete),
    );
}
