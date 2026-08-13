import { concat, ignoreElements, Observable, of, switchMap } from 'rxjs';
import { PlatformEventType } from '@crczp/training-model';
import { CacheService, WatermarkEntry } from '../../cache/cache.interface';
import { EventFetchApi } from '../event-fetch-api';
import { SyncTableComplete } from '../sync-result.interface';
import { getSinceTimestamp, isWatermarkFresh } from './watermark-freshness';

export function syncSingleType(
    eventType: PlatformEventType,
    instanceId: number,
    watermark: WatermarkEntry | undefined,
    fetchApi: EventFetchApi,
    cacheService: CacheService,
): Observable<SyncTableComplete> {
    const complete: SyncTableComplete = { eventType, instanceId };

    if (isWatermarkFresh(watermark)) {
        return of(complete);
    }

    const sinceTimestamp = getSinceTimestamp(watermark);

    return concat(
        fetchApi.fetch({ instanceId, eventType, sinceTimestamp }).pipe(
            switchMap((rows) => cacheService.insert(rows)),
            ignoreElements(),
        ),
        of(complete),
    );
}
