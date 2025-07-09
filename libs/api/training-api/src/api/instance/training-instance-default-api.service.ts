import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {ResponseHeaderContentDispositionReader, SentinelParamsMerger} from '@sentinel/common';
import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {TrainingInstance, TrainingRun} from '@crczp/training-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {TrainingInstanceAssignPoolDTO} from '../../dto/training-instance/training-instance-assign-pool-dto';
import {TrainingInstanceDTO} from '../../dto/training-instance/training-instance-dto';
import {TrainingInstanceMapper} from '../../mappers/training-instance/training-instance-mapper';
import {TrainingRunMapper} from '../../mappers/training-run/training-run-mapper';
import {TrainingInstanceApi} from './training-instance-api.service';
import {
    BlobFileSaver,
    handleJsonError,
    JavaPaginatedResource,
    PaginationMapper,
    ParamsBuilder
} from '@crczp/api-common';
import {TrainingRunDTO} from '../../dto/training-run/training-run-dto';
import {PortalConfig} from "@crczp/common";

/**
 * Default implementation of service abstracting http communication with training instance endpoints.
 */
@Injectable()
export class TrainingInstanceDefaultApi extends TrainingInstanceApi {

    private readonly http = inject(HttpClient);

    private readonly trainingInstancesUriExtension = 'training-instances';
    private readonly trainingRunsUriExtension = 'training-runs';
    private readonly trainingInstancesEndpointUri: string;
    private readonly trainingExportsEndpointUri: string;

    constructor() {
        super();

        const basePath = inject(PortalConfig).basePaths.linearTraining;
        this.trainingInstancesEndpointUri = basePath + this.trainingInstancesUriExtension;
        this.trainingExportsEndpointUri = basePath + 'exports';
    }

    /**
     * Sends http request to retrieve all training instances on specified page of a pagination
     * @param pagination requested pagination
     * @param filters filters to be applied on resources
     */
    getAll(
        pagination: OffsetPaginationEvent,
        filters: SentinelFilter[] = [],
    ): Observable<PaginatedResource<TrainingInstance>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
        ]);
        return this.http
            .get<JavaPaginatedResource<TrainingInstanceDTO>>(this.trainingInstancesEndpointUri, {params})
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<TrainingInstance>(
                            TrainingInstanceMapper.fromDTOs(response.content),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieves training instance by id
     * @param id id of the training instance
     */
    get(id: number): Observable<TrainingInstance> {
        return this.http
            .get<TrainingInstanceDTO>(`${this.trainingInstancesEndpointUri}/${id}`)
            .pipe(map((response) => TrainingInstanceMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve training access token by pool id
     * @param poolId id of the pool
     * @returns access token or null if not found
     */
    getTrainingAccessTokenByPoolId(poolId: number): Observable<string | null> {
        return this.http
            .get(`${this.trainingInstancesEndpointUri}/access/${poolId}`, {
                responseType: 'text',
            })
            .pipe(map((response) => response || null));
    }

    /**
     * Sends http request to retrieve all training runs associated with training instance
     * @param trainingInstanceId id of a training instance associated with training runs
     * @param pagination requested pagination
     * @param isActive true if active training runs should be retrieved, false if archived training runs should be retrieved
     */
    getAssociatedTrainingRuns(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<TrainingRun>> {
        const params = ParamsBuilder.javaPaginationParams(pagination);
        return this.http
            .get<JavaPaginatedResource<TrainingRunDTO>>(
                `${this.trainingInstancesEndpointUri}/${trainingInstanceId}/${this.trainingRunsUriExtension}`,
                {params},
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource(
                            TrainingRunMapper.fromDTOs(response.content),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to create new training instance
     * @param trainingInstance training instance which should be created
     */
    create(trainingInstance: TrainingInstance): Observable<TrainingInstance> {
        return this.http
            .post<TrainingInstanceDTO>(
                this.trainingInstancesEndpointUri,
                TrainingInstanceMapper.toCreateDTO(trainingInstance),
            )
            .pipe(map((response) => TrainingInstanceMapper.fromDTO(response)));
    }

    /**
     * Sends http request to update training instance
     * @param trainingInstance training instance which should be updated
     */
    update(trainingInstance: TrainingInstance): Observable<string> {
        return this.http
            .put(this.trainingInstancesEndpointUri, TrainingInstanceMapper.toUpdateDTO(trainingInstance), {
                responseType: 'text',
            }).pipe(handleJsonError());
    }

    /**
     * Sends http request to delete training instance
     * @param trainingInstanceId id of training instance which should be deleted
     * @param force true if delete should be forced, false otherwise
     */
    delete(trainingInstanceId: number, force = false): Observable<any> {
        const params = new HttpParams().append('forceDelete', force.toString());
        return this.http.delete<any>(`${this.trainingInstancesEndpointUri}/${trainingInstanceId}`, {params});
    }

    /**
     * Sends http request to archive (download) training instance
     * @param id id of training instance which should be archived
     */
    archive(id: number): Observable<boolean> {
        const headers = new HttpHeaders();
        headers.set('Accept', ['application/octet-stream']);
        return this.http
            .get(`${this.trainingExportsEndpointUri}/${this.trainingInstancesUriExtension}/${id}`, {
                responseType: 'blob',
                observe: 'response',
                headers,
            })
            .pipe(
                handleJsonError(),
                map((resp) => {
                    BlobFileSaver.saveBlob(
                        resp.body,
                        ResponseHeaderContentDispositionReader.getFilenameFromResponse(
                            resp,
                            'archived-training-instance.zip',
                        ),
                    );
                    return true;
                }),
            );
    }

    assignPool(trainingInstanceId: number, poolId: number): Observable<any> {
        return this.http.patch(
            `${this.trainingInstancesEndpointUri}/${trainingInstanceId}/assign-pool`,
            new TrainingInstanceAssignPoolDTO(poolId),
        );
    }

    unassignPool(trainingInstanceId: number): Observable<any> {
        return this.http.patch(`${this.trainingInstancesEndpointUri}/${trainingInstanceId}/unassign-pool`, {});
    }

    exportScore(trainingInstanceId: number): Observable<boolean> {
        const headers = new HttpHeaders();
        headers.set('Accept', ['text/plain']);
        return this.http
            .get(
                `${this.trainingExportsEndpointUri}/${this.trainingInstancesUriExtension}/${trainingInstanceId}/scores`,
                {
                    responseType: 'blob',
                    observe: 'response',
                    headers,
                },
            )
            .pipe(
                handleJsonError(),
                map((resp) => {
                    BlobFileSaver.saveBlob(
                        resp.body,
                        ResponseHeaderContentDispositionReader.getFilenameFromResponse(
                            resp,
                            'training-instance-scores.csv',
                        ),
                    );
                    return true;
                }),
            );
    }
}
