import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {BetaTester, Designer, Organizer, TrainingUser} from '@crczp/training-model';
import {Observable} from 'rxjs';

/**
 * Service abstracting http communication with user related endpoints.
 */
export abstract class UserApi {
    /**
     * Sends http request to retrieve organizers not associated with provided training instance
     * @param trainingInstanceId id of a training instance not associated with retrieved organizers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    abstract getOrganizersNotInTI(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
        adaptive: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<Organizer>>;

    /**
     * Sends http request to retrieve designers not associated with provided training definition
     * @param trainingDefinitionId id of a training definition not associated with retrieved designers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    abstract getDesignersNotInTD(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent,
        adaptive: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<Organizer>>;

    /**
     * Sends http request to retrieve authors of a training definition
     * @param trainingDefinitionId id of a training definition associated with retrieved authors
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    abstract getAuthors(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent,
        adaptive: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<Designer>>;

    /**
     * Sends http request to retrieve organizers of a training instance
     * @param trainingInstanceId id of a training instance associated with retrieved organizers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    abstract getOrganizers(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
        adaptive: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<Organizer>>;

    /**
     * Sends http request to create and remove associations between training definition and designers
     * @param trainingDefinitionId id of training definition whose associations shall be altered
     * @param additions ids of designers which should become associated with training definition (become its authors)
     * @param adaptive set to true if data are provided for adaptive definition
     * @param removals  ids of designers which should stop being associated with training definition
     */
    abstract updateAuthors(
        trainingDefinitionId: number,
        additions: number[],
        adaptive: boolean,
        removals: number[],
    ): Observable<any>;

    /**
     * Sends http request to create and remove associations between training instance and organizers
     * @param trainingInstanceId id of training instance whose associations shall be altered
     * @param additions ids of organizers which should become associated with training instance
     * @param adaptive set to true if data are provided for adaptive definition
     * @param removals  ids of organizers which should stop being associated with training instance
     */
    abstract updateOrganizers(
        trainingInstanceId: number,
        additions: number[],
        adaptive: boolean,
        removals: number[],
    ): Observable<any>;

    /**
     * Sends http request to retrieve beta-testers of a training instance
     * @param trainingInstanceId id of a training instance associated with retrieved beta-testers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    abstract getBetaTesters(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
        adaptive: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<BetaTester>>;

    /**
     * Sends http request to retrieve designers associated with provided training definition
     * @param trainingDefinitionId id of a training definition associated with retrieved designers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    abstract getDesigners(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent,
        adaptive: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<Designer>>;

    /**
     * Sends http request to retrieve organizers of a training definition
     * @param trainingDefinitionId id of a training definition associated with retrieved organizers
     * @param pagination requested pagination
     * @param adaptive set to true if data are provided for adaptive definition
     * @param filters requested filtering
     */
    abstract getTrainingDefinitionOrganizers(
        trainingDefinitionId: number,
        pagination: OffsetPaginationEvent,
        adaptive: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<Organizer>>;

    /**
     * Sends http request to retrieve participant for training run
     * @param trainingRunId id of a training run
     */
    abstract getParticipant(trainingRunId: number): Observable<TrainingUser>;
}
