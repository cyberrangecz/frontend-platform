import { inject, Injectable } from '@angular/core';
import { Observable, concatMap, from, switchMap } from 'rxjs';
import { CacheService } from '../../cache/impl/cache.service';
import { WatermarkEntry } from '../../cache/cache.interface';
import { CacheSyncService } from '../sync.interface';
import { SyncParams } from '../sync-params.interface';
import { SyncTableComplete } from '../sync-result.interface';
import { EventFetchApi } from '../event-fetch-api';
import { syncSingleType } from './single-type-sync';

@Injectable({ providedIn: 'root' })
export class SyncService extends CacheSyncService {
    private readonly cacheService = inject(CacheService);
    private readonly fetchApi = inject(EventFetchApi);

    sync(params: SyncParams): Observable<SyncTableComplete> {
        return this.cacheService
            .getWatermarks(params.instanceId, params.eventTypes as string[])
            .pipe(
                switchMap((watermarks) => {
                    const watermarkMap = buildWatermarkMap(watermarks);
                    return from(params.eventTypes).pipe(
                        concatMap((eventType) =>
                            syncSingleType(
                                eventType,
                                params.instanceId,
                                params.poolId,
                                watermarkMap.get(eventType),
                                this.fetchApi,
                                this.cacheService,
                            ),
                        ),
                    );
                }),
            );
    }
}

function buildWatermarkMap(watermarks: WatermarkEntry[]): Map<string, WatermarkEntry> {
    return new Map(watermarks.map((w) => [w.eventType, w]));
}
