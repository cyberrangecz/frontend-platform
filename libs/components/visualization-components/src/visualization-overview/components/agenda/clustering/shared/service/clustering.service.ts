import {inject, Injectable} from '@angular/core';
import {VizOverviewTraineeInfo} from '../../../../../shared/interfaces/viz-overview-trainee-info';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {ClusteringApiService} from '../../../../api/clustering/clustering-api.service';
import {ClusteringMapper} from '../../../../api/mappers/clustering/clustering-mapper';
import {ClusteringTrainingData} from '../../../../model/clustering/clustering-training-data';

@Injectable()
export class ClusteringService {
    private clusteringFinalApiService = inject(ClusteringApiService);


    /**
     * Gets data for clustering and final visualization.
     * @param traineeModeInfo if present anonymize the instance data.
     * @param instanceIds if present uses endpoint that aggregates data from multiple instances.
     */
    public getAllData(traineeModeInfo: VizOverviewTraineeInfo, instanceIds?: number[]): Observable<ClusteringTrainingData> {
        const service = VizOverviewTraineeInfo.isTrainee(traineeModeInfo)
            ? this.clusteringFinalApiService.getAnonymizedClusteringVisualizationData()
            : this.clusteringFinalApiService.getClusteringVisualizationData();

        return service.pipe(
            map((data) => ClusteringMapper.fromDTO(data)),
            catchError((error) => {
                return throwError('clusteringService not connect to API: ' + error.message);
            }),
        );
    }
}
