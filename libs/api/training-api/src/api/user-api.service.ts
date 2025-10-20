import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import {
    JavaPaginatedResource,
    OffsetPaginatedResource,
    PaginationMapper,
    ParamsBuilder,
    QueryParam
} from '@crczp/api-common';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { BetaTester, Designer, Organizer, TrainingUser } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserMapper } from '../mappers/user/user-mapper';
import { UserRefDTO } from '../dto/user/user-ref-dto';
import { PortalConfig } from '@crczp/utils';
import { UserRefSort } from './sorts';

/**
 * Default implementation of service abstracting http communication with user related endpoints.
 */
@Injectable()
export class UserApi {
    private readonly http = inject(HttpClient);

    private readonly trainingDefinitionUriExtension = 'training-definitions';
    private readonly trainingInstanceUrlExtension = 'training-instances';
    private readonly trainingRunUrlExtension = 'training-runs';
    private readonly adaptiveDefsEndpointUri: string;
    private readonly trainingDefsEndpointUri: string;
    private readonly trainingInstancesEndpointUri: string;
    private readonly adaptiveInstancesEndpointUri: string;
    private readonly trainingRunEndpointUri: string;

    constructor() {
        const linearBasePath = inject(PortalConfig).basePaths.linearTraining;
        const adaptiveBasePath =
            inject(PortalConfig).basePaths.adaptiveTraining;

        this.trainingDefsEndpointUri =
            linearBasePath + '/' + this.trainingDefinitionUriExtension;
        this.adaptiveDefsEndpointUri =
            adaptiveBasePath + '/' + this.trainingDefinitionUriExtension;
        this.trainingInstancesEndpointUri =
            linearBasePath + '/' + this.trainingInstanceUrlExtension;
        this.adaptiveInstancesEndpointUri =
            adaptiveBasePath + '/' + this.trainingInstanceUrlExtension;
        this.trainingRunEndpointUri =
            linearBasePath + '/' + this.trainingRunUrlExtension;
    }

    /**
     * Sends http request to retrieve organizers not associated with provided  training instance
     * @param trainingInstanceId id of a training instance not associated with retrieved organizers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    getOrganizersNotInTI(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent<UserRefSort>,
        adaptive: boolean,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<Organizer>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserRefDTO>
            >(`${adaptive ? this.adaptiveInstancesEndpointUri : this.trainingInstancesEndpointUri}/${trainingInstanceId}/organizers-not-in-training-instance`, { params })
            .pipe(map((resp) => this.paginatedUsersFromDTO(resp)));
    }

    /**
     * Sends http request to retrieve designers not associated with provided adaptive definition
     * @param trainingDefinitionId id of a adaptive definition not associated with retrieved designers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    getDesignersNotInTD(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent<UserRefSort>,
        adaptive: boolean,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<Designer>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserRefDTO>
            >(`${adaptive ? this.adaptiveDefsEndpointUri : this.trainingDefsEndpointUri}/${trainingDefinitionId}/designers-not-in-training-definition`, { params })
            .pipe(map((resp) => this.paginatedUsersFromDTO(resp)));
    }

    /**
     * Sends http request to retrieve authors of a adaptive or training definition
     * @param trainingDefinitionId id of a training definition associated with retrieved authors
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    getAuthors(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent<UserRefSort>,
        adaptive: boolean,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<Designer>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserRefDTO>
            >(`${adaptive ? this.adaptiveDefsEndpointUri : this.trainingDefsEndpointUri}/${trainingDefinitionId}/authors`, { params })
            .pipe(map((resp) => this.paginatedUsersFromDTO(resp)));
    }

    /**
     * Sends http request to retrieve organizers of a training instance
     * @param trainingInstanceId id of a training instance associated with retrieved organizers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    getOrganizers(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent<UserRefSort>,
        adaptive: boolean,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<Organizer>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserRefDTO>
            >(`${adaptive ? this.adaptiveInstancesEndpointUri : this.trainingInstancesEndpointUri}/${trainingInstanceId}/organizers`, { params })
            .pipe(map((resp) => this.paginatedUsersFromDTO(resp)));
    }

    /**
     * Sends http request to create and remove associations between training definition and designers
     * @param trainingDefinitionId id of training definition whose associations shall be altered
     * @param additions ids of designers which should become associated with training definition (become its authors)
     * @param adaptive set to true if data are provided for adaptive definition
     * @param removals  ids of designers which should stop being associated with training definition
     */
    updateAuthors(
        trainingDefinitionId: number,
        additions: number[],
        adaptive: boolean,
        removals: number[],
    ): Observable<any> {
        return this.http.put(
            `${
                adaptive
                    ? this.adaptiveDefsEndpointUri
                    : this.trainingDefsEndpointUri
            }/${trainingDefinitionId}/authors`,
            {},
            {
                params: new HttpParams()
                    .set('authorsAddition', additions.toString())
                    .set('authorsRemoval', removals.toString()),
            },
        );
    }

    /**
     * Sends http request to create and remove associations between training instance and organizers
     * @param trainingInstanceId id of training instance whose associations shall be altered
     * @param additions ids of organizers which should become associated with training instance
     * @param adaptive set to true if data are provided for adaptive definition
     * @param removals  ids of organizers which should stop being associated with training instance
     */
    updateOrganizers(
        trainingInstanceId: number,
        additions: number[],
        adaptive: boolean,
        removals: number[],
    ): Observable<any> {
        return this.http.put(
            `${
                adaptive
                    ? this.adaptiveInstancesEndpointUri
                    : this.trainingInstancesEndpointUri
            }/${trainingInstanceId}/organizers`,
            {},
            {
                params: new HttpParams()
                    .set('organizersAddition', additions.toString())
                    .set('organizersRemoval', removals.toString()),
            },
        );
    }

    /**
     * Sends http request to retrieve beta-testers of a training instance
     * @param trainingInstanceId id of a training instance associated with retrieved beta-testers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    getBetaTesters(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent<UserRefSort>,
        adaptive: boolean,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<BetaTester>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserRefDTO>
            >(`${adaptive ? this.adaptiveInstancesEndpointUri : this.trainingInstancesEndpointUri}/${trainingInstanceId}/beta-testers`, { params })
            .pipe(map((resp) => this.paginatedUsersFromDTO(resp)));
    }

    /**
     * Sends http request to retrieve designers associated with provided training definition
     * @param trainingDefinitionId id of a training definition associated with retrieved designers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    getDesigners(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent<UserRefSort>,
        adaptive: boolean,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<Designer>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserRefDTO>
            >(`${adaptive ? this.adaptiveDefsEndpointUri : this.trainingDefsEndpointUri}/${trainingDefinitionId}/designers`, { params })
            .pipe(map((resp) => this.paginatedUsersFromDTO(resp)));
    }

    /**
     * Sends http request to retrieve organizers of a training definition
     * @param trainingDefinitionId id of a training definition associated with retrieved organizers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    getTrainingDefinitionOrganizers(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent<UserRefSort>,
        adaptive: boolean,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<Organizer>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserRefDTO>
            >(`${adaptive ? this.adaptiveDefsEndpointUri : this.trainingDefsEndpointUri}/${trainingDefinitionId}/organizers`, { params })
            .pipe(map((resp) => this.paginatedUsersFromDTO(resp)));
    }

    /**
     * Sends http request to retrieve participant for training run
     * @param trainingRunId id of a training run
     */
    getParticipant(trainingRunId: number): Observable<TrainingUser> {
        return this.http
            .get<UserRefDTO>(
                `${this.trainingRunEndpointUri}/${trainingRunId}/organizers`,
            )
            .pipe(map((resp) => UserMapper.fromDTO(resp)));
    }

    private paginatedUsersFromDTO(
        dto: JavaPaginatedResource<UserRefDTO>,
    ): OffsetPaginatedResource<TrainingUser> {
        return new OffsetPaginatedResource<TrainingUser>(
            UserMapper.fromDTOs(dto.content),
            PaginationMapper.fromJavaDTO(dto.pagination),
        );
    }
}
