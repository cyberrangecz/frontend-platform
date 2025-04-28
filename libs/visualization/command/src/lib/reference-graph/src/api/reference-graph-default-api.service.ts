import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Graph } from '../../../../../../../model/visualization-model/src/lib/reference-graph/graph';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphMapper } from './mappers/graph-mapper';
import { VisualizationConfigService } from '@crczp/command-visualizations/internal';
import { ReferenceGraphApiService } from './reference-graph-api.service';

@Injectable()
export class ReferenceGraphDefaultApiService extends ReferenceGraphApiService {
    private readonly graphEndpoint = `${this.configService.config.trainingBasePath}visualizations/graphs`;

    constructor(
        private http: HttpClient,
        private configService: VisualizationConfigService,
    ) {
        super();
    }

    /**
     * Sends http request to retrieve reference graph for organizer view
     * @param instanceId training instance id
     */
    getReferenceGraphByInstanceId(instanceId: number): Observable<Graph> {
        return this.http
            .get<Graph>(`${this.graphEndpoint}/reference/training-instances/${instanceId}`)
            .pipe(map((response) => GraphMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve reference graph for organizer view
     * @param trainingDefinitionId training definition id
     */
    getReferenceGraphByDefinitionId(trainingDefinitionId: number): Observable<Graph> {
        return this.http
            .get<Graph>(`${this.graphEndpoint}/reference/training-definitions/${trainingDefinitionId}`)
            .pipe(map((response) => GraphMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve reference graph for trainee view
     * @param runId training run id
     */
    getTraineeReferenceGraph(runId: number): Observable<Graph> {
        return this.http
            .get<Graph>(`${this.graphEndpoint}/reference/training-runs/${runId}`)
            .pipe(map((response) => GraphMapper.fromDTO(response)));
    }
}
