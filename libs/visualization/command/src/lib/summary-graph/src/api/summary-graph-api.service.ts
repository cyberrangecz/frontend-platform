import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GraphMapper } from './mappers/graph-mapper';
import { Graph } from '../model/graph';
import { VisualizationConfigService } from '../../../common/service/visualization-config-service';

@Injectable()
export class SummaryGraphApiService {
    private readonly graphEndpoint;

    constructor(
        private http: HttpClient,
        private configService: VisualizationConfigService,
    ) {
        this.graphEndpoint = `${this.configService.config.trainingBasePath}visualizations/graphs`;
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
