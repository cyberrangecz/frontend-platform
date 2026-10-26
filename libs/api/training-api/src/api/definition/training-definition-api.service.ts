import { OffsetPaginationEvent } from '@crczp/utils';
import {
    AbstractLevelBasic,
    HintBasic,
    TrainingDefinition,
    TrainingDefinitionBasic,
    TrainingDefinitionInfo,
    TrainingDefinitionStateEnum,
    TrainingDefinitionWithLevels
} from '@crczp/training-model';
import { Observable } from 'rxjs';
import { OffsetPaginatedResource, QueryParam } from '@crczp/api-common';
import { TrainingDefinitionSort } from '../sorts';

export abstract class LinearTrainingDefinitionApi {
    /**
     * Sends http request to retrieve all training definitions on specified page of a pagination
     * @param pagination requested pagination
     * @param filters filters to be applied on result
     */
    abstract getAll(
        pagination: OffsetPaginationEvent<TrainingDefinitionSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<TrainingDefinition>>;

    /**
     * Sends http request to retrieve all training instances on specified page of a pagination for organizer (different access rights)
     * @param pagination requested pagination
     * @param filters filters to be applied on result
     */
    abstract getAllForOrganizer(
        pagination: OffsetPaginationEvent<TrainingDefinitionSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<TrainingDefinitionInfo>>;

    /**
     * Sends http request to retrieve training definition by its id
     * @param id id of training definition
     */
    abstract get(id: number): Observable<TrainingDefinitionWithLevels>;

    /**
     * Sends http request to change state of a training definition
     * @param trainingDefinitionId id of a training definition which state should be changed
     * @param newState new state to be set
     */
    abstract changeState(
        trainingDefinitionId: number,
        newState: TrainingDefinitionStateEnum,
    ): Observable<any>;

    /**
     * Sends request to download training definition json file.
     * @param id id of training definition which should be downloaded
     */
    abstract download(id: number): Observable<boolean>;

    /**
     * Sends http request to upload training definition json file,
     * Converts training definition file to a JSON object and sends it to provided url.
     * @param file json file to be uploaded
     */
    abstract upload(file: File): Observable<TrainingDefinitionWithLevels>;

    /**
     * Sends http request to delete training definition
     * @param id id of training definition which should be deleted
     */
    abstract delete(id: number): Observable<any>;

    /**
     * Sends http request to clone training definition
     * @param id id of training definition which should be cloned.
     * @param title title of new cloned training definition
     */
    abstract clone(id: number, title: string): Observable<number>;

    /**
     * Sends http request to overwrite a training definition and all its levels in one write; resolves with the stored definition
     * @param trainingDefinition training definition to update
     */
    abstract update(
        trainingDefinition: TrainingDefinitionWithLevels,
    ): Observable<TrainingDefinitionWithLevels>;

    /**
     * Sends http request to create a new training definition together with its levels
     * @param trainingDefinition training definition which should be created
     */
    abstract create(
        trainingDefinition: TrainingDefinitionWithLevels,
    ): Observable<TrainingDefinitionWithLevels>;

    abstract fetchLevelsByIds(ids: number[]): Observable<AbstractLevelBasic[]>;

    abstract fetchTrainingDefinitionsByIds(
        ids: number[],
    ): Observable<TrainingDefinitionBasic[]>;

    abstract fetchHintsByIds(ids: number[]): Observable<HintBasic[]>;
}
