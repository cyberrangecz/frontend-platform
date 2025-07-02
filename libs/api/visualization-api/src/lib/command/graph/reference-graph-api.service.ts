import { Injectable, inject } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {GraphMapper} from './mappers/graph-mapper';
import {VisualizationApiConfig} from '../../config/visualization-api-config';
import {Graph} from '@crczp/visualization-model';

@Injectable()
export class ReferenceGraphApi {
    private http = inject(HttpClient);
    private config = inject(VisualizationApiConfig);

    private readonly graphEndpoint: string;

    constructor() {
        this.graphEndpoint = `${this.config.trainingBasePath}/visualizations/graphs`;
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

    /**
     * Sends http request to retrieve summary graph for training
     * @param instanceId training instance id
     */
    getSummaryGraph(instanceId: number): Observable<Graph> {
        return this.http
            .get<Graph>(`${this.graphEndpoint}/summary/training-instances/${instanceId}`)
            .pipe(map((response) => GraphMapper.fromDTO(response)));
    }
}
