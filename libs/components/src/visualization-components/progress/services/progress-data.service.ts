import { DestroyRef, inject, Injectable } from '@angular/core';
import { ProgressVisualizationApi } from '@crczp/visualization-api';
import { PortalConfig } from '@crczp/utils';
import { delay, merge, Observable, repeat, shareReplay, skip } from 'rxjs';
import { ProgressVisualizationApiData } from '@crczp/visualization-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class ProgressDataService {
    protected readonly api = inject(ProgressVisualizationApi);
    protected readonly config = inject(PortalConfig);

    private readonly destroyRef = inject(DestroyRef);

    /**
     * Returns observable stream of visualization data with periodic polling.
     * @param instanceId - Training instance ID
     * @returns Observable emitting progress data updates
     */
    public getVisualizationData$(
        instanceId: number,
    ): Observable<ProgressVisualizationApiData> {
        const data$ = this.api.getVisualizationData(instanceId);

        return merge(
            data$,
            data$.pipe(
                takeUntilDestroyed(this.destroyRef),
                delay(this.config.polling.pollingPeriodShort),
                repeat(),
                skip(1),
            ),
        ).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
}
