import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import {
    AccessedTrainingRun,
    AccessTrainingRunInfo,
    Hint,
    Level,
    LevelAnswerCheck,
    Question,
    TrainingRun,
    TrainingRunInfo,
} from '@crczp/training-model';
import { Observable } from 'rxjs';
import { OffsetPaginatedResource, QueryParam } from '@crczp/api-common';
import { AccessedTrainingRunSort, TrainingRunSort } from '../sorts';

export abstract class LinearRunApi {
    /**
     * Sends http request to retrieve all training runs on specified page of a pagination
     * @param pagination requested pagination
     * @param filters filters to be applied on resources
     */
    abstract getAll(
        pagination: OffsetPaginationEvent<TrainingRunSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<TrainingRun>>;

    /**
     * Sends http request to retrieve training run by id
     * @param id id of training run which should be retrieved
     */
    abstract get(id: number): Observable<TrainingRun>;

    /**
     * Sends http request to retrieve training run already accessed by logged in user
     * @param pagination requested pagination
     * @param filters to be applied on resources
     */
    abstract getAccessed(
        pagination: OffsetPaginationEvent<AccessedTrainingRunSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<AccessedTrainingRun>>;

    /**
     * Sends http request to retrieve info about training run by id
     * @param id id of training run which should be retrieved
     */
    abstract getInfo(id: number): Observable<TrainingRunInfo[]>;

    /**
     * Sends http request to delete training run
     * @param trainingRunId id of a training run which should be deleted
     * @param force true if delete should be forced, false otherwise
     */
    abstract delete(trainingRunId: number, force?: boolean): Observable<any>;

    /**
     * Sends http request to delete training runs in batch
     * @param trainingRunIds ids of training runs which should be deleted
     * @param force true if delete should be forced, false otherwise
     */
    abstract deleteMultiple(
        trainingRunIds: number[],
        force?: boolean,
    ): Observable<any>;

    /**
     * Sends http request to access training run with access token.
     * @param token access token to access the training run
     */
    abstract access(token: string): Observable<AccessTrainingRunInfo>;

    /**
     * Sends http request to resume in training run
     * @param trainingRunId id of a training run to resume
     */
    abstract resume(trainingRunId: number): Observable<AccessTrainingRunInfo>;

    /**
     * Sends http request to move to next level
     * @param trainingRunId id of a training run
     */
    abstract nextLevel(trainingRunId: number): Observable<Level>;

    /**
     * Sends http request to submit the answer from training level and check its valid
     * @param trainingRunId id of training run in which the answer should be submitted
     * @param answer a answer submitted by user
     */
    abstract isCorrectAnswer(
        trainingRunId: number,
        answer: string,
    ): Observable<LevelAnswerCheck>;

    /**
     * Sends http request to submit the passkey from access level and check its valid
     * @param trainingRunId id of training run in which the passkey should be submitted
     * @param passkey a passkey submitted by user
     */
    abstract isCorrectPasskey(
        trainingRunId: number,
        passkey: string,
    ): Observable<boolean>;

    /**
     * Sends http request to display hint and deduct points for it
     * @param trainingRunId id of training run in which, hint should be revealed
     * @param hintId id of requested hint
     */
    abstract takeHint(trainingRunId: number, hintId: number): Observable<Hint>;

    /**
     * Sends http request to display solution to a level
     * @param trainingRunId id of the training run in which, solution should be revealed
     */
    abstract takeSolution(trainingRunId: number): Observable<string>;

    /**
     * Sends http request to submit user answers for questions in assessment level
     * @param trainingRunId id of the training run in which, questions should be submitted
     * @param questions questions which answers should be submitted
     */
    abstract submitAnswers(
        trainingRunId: number,
        questions: Question[],
    ): Observable<any>;

    /**
     * Sends http request to finish active training run
     * @param trainingRunId id of a training run which should be finished
     */
    abstract finish(trainingRunId: number): Observable<any>;

    /**
     * Sends http request to archive training run
     * @param trainingRunId id of a training run which should be archived
     */
    abstract archive(trainingRunId: number): Observable<any>;

    /**
     * Sends http request to move to specified finished level
     * @param trainingRunId id of a training run in which level should be accessed
     * @param levelId id of a level, which to be switched to
     */
    abstract moveToLevel(
        trainingRunId: number,
        levelId: number,
    ): Observable<Level>;
}
