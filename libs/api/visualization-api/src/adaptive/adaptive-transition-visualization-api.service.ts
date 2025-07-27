import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VisualizationDataMapper } from './mappers/visualization-data-mapper';
import { VisualizationApiConfig } from '../config/visualization-api-config';
import { TransitionVisualizationData } from '@crczp/visualization-model';
import { AdaptiveVisualizationDataDTO } from './dto/run-visualization-dto';

@Injectable()
export class AdaptiveTransitionVisualizationApi {
    private readonly http = inject(HttpClient);
    private config = inject(VisualizationApiConfig);

    getDataForTrainingInstance(
        trainingInstanceId: number
    ): Observable<TransitionVisualizationData> {
        return this.http
            .get<AdaptiveVisualizationDataDTO>(
                this.config.adaptiveBasePath +
                    `/visualizations/training-instances/${trainingInstanceId}/transitions-graph`
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }

    getDataForTrainingRun(
        trainingRunId: number
    ): Observable<TransitionVisualizationData> {
        return this.http
            .get<AdaptiveVisualizationDataDTO>(
                this.config.adaptiveBasePath +
                    `/visualizations/training-runs/${trainingRunId}/transitions-graph`
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
