import {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {VisualizationDataDTO} from '../dto/visualization-data-dto';
import {ConfigService} from '../config/config.service';
import {VisualizationDataMapper} from '../mappers/visualization-data-mapper';
import {TransitionGraphVisualizationData} from '../model/transition-graph-visualization-data';

@Injectable({
    providedIn: 'root',
})
export class AdaptiveTransitionVisualizationApi {
    private http = inject(HttpClient);
    private configService = inject(ConfigService);


    getDataForTrainingInstance(trainingInstanceId: number): Observable<TransitionGraphVisualizationData> {
        return this.http
            .get<VisualizationDataDTO>(
                this.configService.config.trainingServiceUrl +
                `visualizations/training-instances/${trainingInstanceId}/transitions-graph`,
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }

    getDataForTrainingRun(trainingRunId: number): Observable<TransitionGraphVisualizationData> {
        return this.http
            .get<VisualizationDataDTO>(
                this.configService.config.trainingServiceUrl +
                `visualizations/training-runs/${trainingRunId}/transitions-graph`,
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
