import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VisualizationDataDTO } from './dto/visualization-data-dto';
import { VisualizationDataMapper } from './mappers/visualization-data-mapper';
import { VisualizationApiConfig } from '../config/visualization-api-config';
import { TransitionVisualizationData } from '@crczp/visualization-model';

@Injectable()
export class AdaptiveTransitionVisualizationApi {
    constructor(
        private http: HttpClient,
        private config: VisualizationApiConfig
    ) {}

    getDataForTrainingInstance(trainingInstanceId: number): Observable<TransitionVisualizationData> {
        return this.http
            .get<VisualizationDataDTO>(
                this.config.adaptiveBasePath +
                    `visualizations/training-instances/${trainingInstanceId}/transitions-graph`,
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }

    getDataForTrainingRun(trainingRunId: number): Observable<TransitionVisualizationData> {
        return this.http
            .get<VisualizationDataDTO>(
                this.config.adaptiveBasePath +
                    `visualizations/training-runs/${trainingRunId}/transitions-graph`,
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
