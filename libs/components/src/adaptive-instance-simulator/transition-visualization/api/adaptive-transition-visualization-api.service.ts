import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VisualizationDataDTO } from '../dto/visualization-data-dto';
import { VisualizationDataMapper } from '../mappers/visualization-data-mapper';
import { TransitionGraphVisualizationData } from '../model/transition-graph-visualization-data';
import { PortalConfig } from '@crczp/utils';

@Injectable({
    providedIn: 'root',
})
export class AdaptiveTransitionVisualizationApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = inject(PortalConfig).basePaths.linearTraining;

    getDataForTrainingInstance(
        trainingInstanceId: number,
    ): Observable<TransitionGraphVisualizationData> {
        return this.http
            .get<VisualizationDataDTO>(
                `${this.apiUrl}/visualizations/training-instances/${trainingInstanceId}/transitions-graph`,
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }

    getDataForTrainingRun(
        trainingRunId: number,
    ): Observable<TransitionGraphVisualizationData> {
        return this.http
            .get<VisualizationDataDTO>(
                `${this.apiUrl}/visualizations/training-runs/${trainingRunId}/transitions-graph`,
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
