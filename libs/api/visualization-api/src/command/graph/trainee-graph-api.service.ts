import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Graph } from '@crczp/visualization-model';
import { map } from 'rxjs/operators';
import { TrainingRun } from '@crczp/training-model';
import { TrainingRunDTO, TrainingRunMapper } from '@crczp/training-api';
import { GraphMapper } from './mappers/graph-mapper';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class TraineeGraphApiService {
    private readonly http = inject(HttpClient);

    private readonly visualizationsEndpoint =
        inject(PortalConfig).basePaths.linearTraining + '/visualizations';

    /**
     * Sends http request to retrieve trainee graph for trainee
     * @param runId sandbox id of trainee
     */
    getTraineeGraph(runId: number): Observable<Graph> {
        return this.http
            .get<Graph>(
                `${this.visualizationsEndpoint}/graphs/trainee/training-runs/${runId}`
            )
            .pipe(map((response) => GraphMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve all trainees - their sandbox ids in training
     */
    getTrainingRunsOfTrainingInstance(
        instanceId: number
    ): Observable<TrainingRun[]> {
        return this.http
            .get<TrainingRunDTO[]>(
                `${this.visualizationsEndpoint}/training-instances/${instanceId}/training-runs`
            )
            .pipe(map((response) => TrainingRunMapper.fromDTOs(response)));
    }
}
