import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { TrainingInstance, TrainingRun } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { OffsetPaginatedResource, QueryParam } from '@crczp/api-common';
import { TrainingInstanceSort, TrainingRunSort } from '../sorts';

export abstract class AdaptiveTrainingInstanceApi {
    /**
     * Sends http request to retrieve all training instances on specified page of a pagination
     * @param pagination requested pagination
     * @param filters filters to be applied on resources
     */
    abstract getAll(
        pagination: OffsetPaginationEvent<TrainingInstanceSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<TrainingInstance>>;

    /**
     * Sends http request to retrieves training instance by id
     * @param id id of the training instance
     */
    abstract get(id: number): Observable<TrainingInstance>;

    /**
     * Sends http request to retrieve training access token by pool id
     * @param poolId id of the pool
     */
    abstract getTrainingAccessTokenByPoolId(poolId: number): Observable<string>;

    /**
     * Sends http request to retrieve all training runs associated with training instance
     * @param trainingInstanceId id of a training instance associated with training runs
     * @param pagination requested pagination
     */
    abstract getAssociatedTrainingRuns(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent<TrainingRunSort>,
    ): Observable<OffsetPaginatedResource<TrainingRun>>;

    /**
     * Sends http request to create new training instance
     * @param trainingInstance training instance which should be created
     */
    abstract create(
        trainingInstance: TrainingInstance,
    ): Observable<TrainingInstance>;

    /**
     * Sends http request to update training instance
     * @param trainingInstance training instance which should be updated
     */
    abstract update(trainingInstance: TrainingInstance): Observable<string>;

    /**
     * Sends http request to delete training instance
     * @param trainingInstanceId id of training instance which should be deleted
     * @param force true if delete should be forced, false otherwise
     */
    abstract delete(
        trainingInstanceId: number,
        force: boolean,
        expectedErrorCodes?: number[],
    ): Observable<any>;

    /**
     * Sends http request to archive (download) training instance
     * @param id id of training instance which should be archived
     */
    abstract archive(id: number): Observable<boolean>;

    /**
     * Sends http request to associate training instance with pool
     * @param trainingInstanceId id of a training instance to associate with pool
     * @param poolId id of a pool to assign to training instance
     */
    abstract assignPool(
        trainingInstanceId: number,
        poolId: number,
    ): Observable<any>;

    /**
     * Sends http request to remove association with pool
     * @param trainingInstanceId id of training instance which pool should be unassigned
     */
    abstract unassignPool(trainingInstanceId: number): Observable<any>;
}
