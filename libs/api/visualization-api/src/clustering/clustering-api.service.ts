import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {ClusteringVisualizationData} from '@crczp/visualization-model';
import {ClusteringVisualizationDataDTO, SseDTO} from './dtos';
import {RadarChartDataMapper} from './mappers/radar-chart-data-mapper';
import {ClusterVisualizationDataMapper} from './mappers/cluster-visualization-data-mapper';
import {SseDataMapper} from './mappers/sse-data-mapper';
import {PortalConfig} from "@crczp/common";

/**
 * Default implementation of service abstracting http communication with visualization data endpoints.
 */
@Injectable()
export class ClusteringApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = inject(PortalConfig).basePaths.linearTraining + 'clusters';

    /**
     * Sends http request to retrieve all data for visualizations
     */
    getVisualizationData(
        trainingDefinitionId: number,
        featureType: string,
        numberOfClusters: number,
        instanceIds: number[],
        level: number,
    ): Observable<ClusteringVisualizationData> {
        return this.http
            .get<ClusteringVisualizationDataDTO>(
                `${this.apiUrl}/training-definitions/${trainingDefinitionId}/${featureType}`,
                {params: this.addParams(numberOfClusters, instanceIds, level)},
            )
            .pipe(map((response) => ClusterVisualizationDataMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve data for radar chart
     */
    getRadarChartData(
        trainingDefinitionId: number,
        numberOfClusters: number,
        instanceIds: number[],
        level: number,
    ): Observable<ClusteringVisualizationData> {
        return this.http
            .get<ClusteringVisualizationDataDTO>(
                `${this.apiUrl}/training-definitions/${trainingDefinitionId}/n-dimensional`,
                {params: this.addParams(numberOfClusters, instanceIds, level)},
            )
            .pipe(map((response) => RadarChartDataMapper.fromDTO(response)));
    }

    getFeatureSSE(
        trainingDefinitionId: number,
        featureType: string,
        numberOfClusters: number,
        instanceIds: number[],
        level: number,
    ): Observable<SseDataMapper> {
        return this.http
            .get<SseDTO>(
                `${this.apiUrl}/training-definitions/${trainingDefinitionId}/${featureType}/sse`,
                {params: this.addParams(numberOfClusters, instanceIds, level)},
            )
            .pipe(map((response) => SseDataMapper.fromDTO(response)));
    }

    private addParams(numberOfClusters: number, instanceIds: number[], level: number) {
        const params = {};
        params['numberOfClusters'] = numberOfClusters;
        if (instanceIds !== undefined && instanceIds.length !== 0) params['instanceIds'] = instanceIds;
        if (level) params['levelId'] = level;
        return params;
    }
}
