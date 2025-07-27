import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ClusteringVisualizationResourceDTO } from '../dto/clustering/clustering-visualization-resource-dto';
import { PortalConfig } from '@crczp/utils';
import { VizConfigService } from '../../../../common/viz-config.service';

@Injectable()
export class ClusteringApiService {
    private readonly http = inject(HttpClient);
    private readonly configService = inject(VizConfigService);

    private readonly trainingVisualizationEndpoint: string;
    private readonly anonymizedTrainingVisualizationEndpoint: string;

    constructor() {
        const baseUrl = inject(PortalConfig).basePaths.linearTraining;

        this.trainingVisualizationEndpoint =
            baseUrl + 'visualizations/training-instances';
        this.anonymizedTrainingVisualizationEndpoint =
            baseUrl + 'visualizations/training-runs';
    }

    /**
     * Sends http request to obtain data for clustering visualization and if @instanceIds is provided used aggregated
     * data from multiple instances specified by this parameter.
     * @param instanceIds if present uses endpoint that aggregates data from multiple instances.
     */
    getClusteringVisualizationData(
        instanceIds?: number[]
    ): Observable<ClusteringVisualizationResourceDTO> {
        return this.http.get<ClusteringVisualizationResourceDTO>(
            `${this.trainingVisualizationEndpoint}/clustering`,
            {
                params: { instanceIds: instanceIds },
            }
        );
    }

    getAnonymizedClusteringVisualizationData(): Observable<ClusteringVisualizationResourceDTO> {
        return this.http.get<ClusteringVisualizationResourceDTO>(
            `${this.anonymizedTrainingVisualizationEndpoint}/${this.configService.trainingRunId}/clustering`
        );
    }
}
