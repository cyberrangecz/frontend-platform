import { inject, Injectable } from '@angular/core';
import { ProgressVisualizationApi } from '@crczp/visualization-api';
import { PortalConfig } from '@crczp/utils';
import { delay, merge, Observable, repeat, shareReplay, skip } from 'rxjs';
import { ProgressVisualizationData } from '@crczp/visualization-model';

@Injectable()
export class ProgressDataService {
    protected readonly api = inject(ProgressVisualizationApi);
    protected readonly config = inject(PortalConfig);

    public getVisualizationData$(
        instanceId: number,
    ): Observable<ProgressVisualizationData> {
        const data$ = this.api.getVisualizationData(instanceId);

        return merge(
            data$,
            data$.pipe(
                delay(this.config.polling.pollingPeriodShort),
                repeat(),
                skip(1),
            ),
        ).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
}
