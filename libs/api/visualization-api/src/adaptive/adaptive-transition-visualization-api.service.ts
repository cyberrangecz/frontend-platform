import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VisualizationDataMapper } from './mappers/visualization-data-mapper';
import { TransitionVisualizationData } from '@crczp/visualization-model';
import { AdaptiveVisualizationDataDTO } from './dto/run-visualization-dto';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class AdaptiveTransitionVisualizationApi {
    private readonly http = inject(HttpClient);
    private config = inject(PortalConfig);

    getDataForTrainingInstance(
        trainingInstanceId: number
    ): Observable<TransitionVisualizationData> {
        return this.http
            .get<AdaptiveVisualizationDataDTO>(
                this.config.basePaths.adaptiveTraining +
                    `/visualizations/training-instances/${trainingInstanceId}/transitions-graph`
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }

    getDataForTrainingRun(
        trainingRunId: number
    ): Observable<TransitionVisualizationData> {
        return this.http
            .get<AdaptiveVisualizationDataDTO>(
                this.config.basePaths.adaptiveTraining +
                    `/visualizations/training-runs/${trainingRunId}/transitions-graph`
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
