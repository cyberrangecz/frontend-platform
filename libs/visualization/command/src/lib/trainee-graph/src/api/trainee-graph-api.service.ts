import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Graph } from '../model/graph';
import { map } from 'rxjs/operators';
import { GraphMapper } from './mappers/graph-mapper';
import { VisualizationConfigService } from '@crczp/command-visualizations/internal';
import { TrainingRunMapper } from './mappers/training-run-mapper';
import { TrainingRunDTO } from './dto/training-run-dto';
import { TrainingRun } from '../model/training-run';

@Injectable()
export class TraineeGraphApiService {
    private readonly visualizationsEndpoint = `${this.configService.config.trainingBasePath}visualizations`;

    constructor(
        private http: HttpClient,
        private configService: VisualizationConfigService,
    ) {}

    /**
     * Sends http request to retrieve trainee graph for trainee
     * @param runId sandbox id of trainee
     */
    getTraineeGraph(runId: number): Observable<Graph> {
        return this.http
            .get<Graph>(`${this.visualizationsEndpoint}/graphs/trainee/training-runs/${runId}`)
            .pipe(map((response) => GraphMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve all trainees - their sandbox ids in training
     */
    getTrainingRunsOfTrainingInstance(instanceId: number): Observable<TrainingRun[]> {
        return this.http
            .get<TrainingRunDTO[]>(`${this.visualizationsEndpoint}/training-instances/${instanceId}/training-runs`)
            .pipe(map((response) => TrainingRunMapper.fromDTOs(response)));
    }
}
