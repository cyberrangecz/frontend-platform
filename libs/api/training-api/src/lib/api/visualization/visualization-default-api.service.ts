import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Trainee, TrainingUser, VisualizationInfo } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserRestResource } from '../../dto/rest/user-rest-resource-dto';
import { UserMapper } from '../../mappers/user/user-mapper';
import { TrainingApiContext } from '../../other/training-api-context';
import { UserRefDTO } from './../../dto/user/user-ref-dto';
import { VisualizationInfoDTO } from './../../dto/visualization/visualization-info-dto';
import { VisualizationInfoMapper } from './../../mappers/visualization/visualization-info-mapper';
import { VisualizationApi } from './visualization-api.service';
import { PaginationMapper, ParamsBuilder } from '@crczp/api-common';

@Injectable()
export class VisualizationDefaultApi extends VisualizationApi {
    readonly visualizationsUriExtension = 'visualizations';
    readonly trainingInstanceUrlExtension = 'training-instances';
    readonly trainingRunUrlExtension = 'training-runs';

    readonly visualizationsEndpointUri: string;

    constructor(
        private http: HttpClient,
        private context: TrainingApiContext,
    ) {
        super();
        this.visualizationsEndpointUri = this.context.config.trainingBasePath + this.visualizationsUriExtension;
    }

    /**
     * Sends http request to retrieve visualization info for training instance
     * @param trainingInstanceId id of a training instance associated with retrieved visualization info
     */
    getInfo(trainingInstanceId: number): Observable<VisualizationInfo> {
        return this.http
            .get<VisualizationInfoDTO>(
                `${this.visualizationsEndpointUri}/${this.trainingInstanceUrlExtension}/${trainingInstanceId}`,
            )
            .pipe(map((resp) => VisualizationInfoMapper.fromDTO(resp)));
    }

    /**
     * Sends http request to retrieve participants for training instance
     * @param trainingInstanceId id of a training instance associated with retrieved participants
     */
    getParticipants(trainingInstanceId: number): Observable<Trainee[]> {
        return this.http
            .get<
                UserRefDTO[]
            >(`${this.visualizationsEndpointUri}/${this.trainingInstanceUrlExtension}/${trainingInstanceId}/participants`)
            .pipe(map((resp) => UserMapper.fromDTOs(resp)));
    }

    /**
     * Sends http request to retrieve visualization info for training run
     * @param trainingRunId id of a training run associated with retrieved visualization info
     */
    getTrainingRunInfo(trainingRunId: number): Observable<VisualizationInfo> {
        return this.http
            .get<VisualizationInfoDTO>(
                `${this.visualizationsEndpointUri}/${this.trainingRunUrlExtension}/${trainingRunId}`,
            )
            .pipe(map((resp) => VisualizationInfoMapper.fromDTO(resp)));
    }

    /**
     * Sends http request to retrieve users by their ids
     * @param usersIds ids of users to get
     * @param pagination requested pagination
     * @param filters requested filtering
     */
    getUsers(
        usersIds: number[],
        pagination: OffsetPaginationEvent,
        filters: SentinelFilter[] = [],
    ): Observable<PaginatedResource<TrainingUser>> {
        const idsParam = new HttpParams().set('ids', usersIds.toString());
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
            idsParam,
        ]);
        return this.http.get<UserRestResource>(`${this.visualizationsEndpointUri}/users`, { params }).pipe(
            map((resp) => {
                return new PaginatedResource<TrainingUser>(
                    UserMapper.fromDTOs(resp.content),
                    PaginationMapper.fromJavaDTO(resp.pagination),
                );
            }),
        );
    }
}
