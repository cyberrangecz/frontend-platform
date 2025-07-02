import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from '../../../config/config.service';
import {ClusteringVisualizationResourceDTO} from '../dto/clustering/clustering-visualization-resource-dto';

@Injectable()
export class ClusteringApiService {
    private readonly trainingVisualizationEndpoint: string;

    private readonly anonymizedTrainingVisualizationEndpoint: string;

    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) {
        this.trainingVisualizationEndpoint =
            this.configService.config.trainingServiceUrl + 'visualizations/training-instances';

        this.anonymizedTrainingVisualizationEndpoint =
            this.configService.config.trainingServiceUrl + 'visualizations/training-runs';
    }

    /**
     * Sends http request to obtain data for clustering visualization and if @instanceIds is provided used aggregated
     * data from multiple instances specified by this parameter.
     * @param instanceIds if present uses endpoint that aggregates data from multiple instances.
     */
    getClusteringVisualizationData(instanceIds?: number[]): Observable<ClusteringVisualizationResourceDTO> {
        return this.buildRequest(instanceIds);
    }

    getAnonymizedClusteringVisualizationData(): Observable<ClusteringVisualizationResourceDTO> {
        return this.http.get<ClusteringVisualizationResourceDTO>(
            `${this.anonymizedTrainingVisualizationEndpoint}/${this.configService.trainingRunId}/clustering`
        );
    }

    private buildRequest(instanceIds: number[]): Observable<ClusteringVisualizationResourceDTO> {
        if (instanceIds) {
            return this.http.get<ClusteringVisualizationResourceDTO>(
                `${this.trainingVisualizationEndpoint}/clustering`,
                {
                    params: { instanceIds: instanceIds }
                }
            );
        }
        return this.http.get<ClusteringVisualizationResourceDTO>(
            `${this.trainingVisualizationEndpoint}/${this.configService.trainingInstanceId}/clustering`
        );
    }
}
