import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import {
    AccessedTrainingRun,
    AccessTrainingRunInfo,
    Hint,
    Level,
    LevelAnswerCheck,
    Question,
    TrainingRun,
    TrainingRunInfo
} from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AbstractLevelDTO } from '../../dto/level/abstract-level-dto';
import { HintDTO } from '../../dto/level/training/hint-dto';
import { IsCorrectAnswerDto } from '../../dto/level/training/is-correct-answer-dto';
import { AccessTrainingRunDTO } from '../../dto/training-run/access-training-run-dto';
import { TrainingRunDTO } from '../../dto/training-run/training-run-dto';
import { QuestionMapper } from '../../mappers/level/assessment/question-mapper';
import { HintMapper } from '../../mappers/level/training/hint-mapper';
import { LevelMapper } from '../../mappers/level/level-mapper';
import { AccessTrainingRunMapper } from '../../mappers/training-run/access-training-run-mapper';
import { AccessedTrainingRunMapper } from '../../mappers/training-run/accessed-training-run-mapper';
import { LevelAnswerMapper } from '../../mappers/training-run/level-answer-mapper';
import { TrainingRunMapper } from '../../mappers/training-run/training-run-mapper';
import { TrainingApiContext } from '../../other/training-api-context';
import { TrainingRunApi } from './training-run-api.service';
import { TrainingRunInfoDTO } from '../../dto/training-run/training-run-info-dto';
import { TrainingRunInfoMapper } from '../../mappers/training-run/training-run-info-mapper';
import { AnsweredLevelMapper } from '../../mappers/training-run/training-run-levels/answered-level-mapper';
import { JavaPaginatedResource, PaginationMapper, ParamsBuilder } from '@crczp/api-common';

/**
 * Default implementation of service abstracting http communication with training run endpoints.
 */
@Injectable()
export class TrainingRunDefaultApi extends TrainingRunApi {
    readonly trainingRunsUriExtension = 'training-runs';

    readonly trainingRunsEndpointUri: string;

    constructor(
        private http: HttpClient,
        private context: TrainingApiContext,
    ) {
        super();
        this.trainingRunsEndpointUri = this.context.config.trainingBasePath + this.trainingRunsUriExtension;
    }

    /**
     * Sends http request to retrieve all training runs on specified page of a pagination
     * @param pagination requested pagination
     * @param filters filters to be applied on resources
     */
    getAll(
        pagination: OffsetPaginationEvent,
        filters: SentinelFilter[] = [],
    ): Observable<PaginatedResource<TrainingRun>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
        ]);
        return this.http
            .get<JavaPaginatedResource<TrainingRunDTO>>(this.trainingRunsEndpointUri, { params })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<TrainingRun>(
                            TrainingRunMapper.fromDTOs(response.content),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve training run by id
     * @param id id of training run which should be retrieved
     */
    get(id: number): Observable<TrainingRun> {
        return this.http
            .get<TrainingRunDTO>(`${this.trainingRunsEndpointUri}/${id}`)
            .pipe(map((response) => TrainingRunMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve training run already accessed by logged in user
     * @param pagination requested pagination
     * @param filters to be applied on resources
     */
    getAccessed(
        pagination: OffsetPaginationEvent,
        filters: SentinelFilter[] = [],
    ): Observable<PaginatedResource<AccessedTrainingRun>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
        ]);

        return this.http
            .get<JavaPaginatedResource<AccessTrainingRunDTO>>(`${this.trainingRunsEndpointUri}/accessible`, { params })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<AccessedTrainingRun>(
                            AccessedTrainingRunMapper.fromDTOs(response.content),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve info about training run by id
     * @param id id of training run which should be retrieved
     */
    getInfo(id: number): Observable<TrainingRunInfo[]> {
        return this.http
            .get<TrainingRunInfoDTO[]>(`${this.trainingRunsEndpointUri}/${id}/answers`)
            .pipe(map((response) => TrainingRunInfoMapper.fromDTOs(response)));
    }

    /**
     * Sends http request to delete training run
     * @param trainingRunId id of a training run which should be deleted
     * @param force true if delete should be forced, false otherwise
     */
    delete(trainingRunId: number, force = false): Observable<any> {
        const params = new HttpParams().append('forceDelete', force.toString());
        return this.http.delete(`${this.trainingRunsEndpointUri}/${trainingRunId}`, { params });
    }

    /**
     * Sends http request to delete training runs in batch
     * @param trainingRunIds ids of training runs which should be deleted
     * @param force true if delete should be forced, false otherwise
     */
    deleteMultiple(trainingRunIds: number[], force = false): Observable<any> {
        const params = new HttpParams()
            .append('trainingRunIds', trainingRunIds.toString())
            .append('forceDelete', force.toString());
        return this.http.delete(this.trainingRunsEndpointUri, { params });
    }

    /**
     * Sends http request to access training run with access token.
     * @param token access token to access the training run
     */
    access(token: string): Observable<AccessTrainingRunInfo> {
        const params = new HttpParams().append('accessToken', token);
        return this.http
            .post<AccessTrainingRunDTO>(this.trainingRunsEndpointUri, {}, { params })
            .pipe(map((response) => AccessTrainingRunMapper.fromDTO(response)));
    }

    /**
     * Sends http request to resume in training run
     * @param trainingRunId id of a training run to resume
     */
    resume(trainingRunId: number): Observable<AccessTrainingRunInfo> {
        return this.http
            .get<AccessTrainingRunDTO>(`${this.trainingRunsEndpointUri}/${trainingRunId}/resumption`)
            .pipe(map((response) => AccessTrainingRunMapper.fromDTO(response)));
    }

    /**
     * Sends http request to move to next level
     * @param trainingRunId id of a training run
     */
    nextLevel(trainingRunId: number): Observable<Level> {
        return this.http
            .get<AbstractLevelDTO>(`${this.trainingRunsEndpointUri}/${trainingRunId}/next-levels`)
            .pipe(map((response) => LevelMapper.fromDTO(response)));
    }

    /**
     * Sends http request to submit the answer from training level and check its valid
     * @param trainingRunId id of training run in which the answer should be submitted
     * @param answer a answer submitted by user
     */
    isCorrectAnswer(trainingRunId: number, answer: string): Observable<LevelAnswerCheck> {
        return this.http
            .post<IsCorrectAnswerDto>(`${this.trainingRunsEndpointUri}/${trainingRunId}/is-correct-answer`, { answer })
            .pipe(map((response) => LevelAnswerMapper.fromDTO(response)));
    }

    /**
     * Sends http request to submit the passkey from access level and check its valid
     * @param trainingRunId id of training run in which the passkey should be submitted
     * @param passkey a passkey submitted by user
     */
    isCorrectPasskey(trainingRunId: number, passkey: string): Observable<boolean> {
        return this.http.post<boolean>(`${this.trainingRunsEndpointUri}/${trainingRunId}/is-correct-passkey`, {
            passkey,
        });
    }

    /**
     * Sends http request to display hint and deduct points for it
     * @param trainingRunId id of training run in which, hint should be revealed
     * @param hintId id of requested hint
     */
    takeHint(trainingRunId: number, hintId: number): Observable<Hint> {
        return this.http
            .get<HintDTO>(`${this.trainingRunsEndpointUri}/${trainingRunId}/hints/${hintId}`)
            .pipe(map((response) => HintMapper.fromDTO(response)));
    }

    /**
     * Sends http request to display solution to a level
     * @param trainingRunId id of the training run in which, solution should be revealed
     */
    takeSolution(trainingRunId: number): Observable<string> {
        return this.http.get(`${this.trainingRunsEndpointUri}/${trainingRunId}/solutions`, { responseType: 'text' });
    }

    /**
     * Sends http request to submit user answers for questions in assessment level
     * @param trainingRunId id of the training run in which, questions should be submitted
     * @param questions questions which answers should be submitted
     */
    submitAnswers(trainingRunId: number, questions: Question[]): Observable<any> {
        return this.http.put(
            `${this.trainingRunsEndpointUri}/${trainingRunId}/assessment-evaluations`,
            QuestionMapper.toAnswersDTOs(questions),
        );
    }

    /**
     * Sends http request to finish active training run
     * @param trainingRunId id of a training run which should be finished
     */
    finish(trainingRunId: number): Observable<any> {
        return this.http.put(`${this.trainingRunsEndpointUri}/${trainingRunId}`, null);
    }

    /**
     * Sends http request to archive training run
     * @param trainingRunId id of a training run which should be archived
     */
    archive(trainingRunId: number): Observable<any> {
        return this.http.patch(`${this.trainingRunsEndpointUri}/${trainingRunId}/archive`, null);
    }

    /**
     * Sends http request to move to specified finished level
     * @param trainingRunId id of a training run in which level should be accessed
     * @param levelId id of a level, which to be switched to
     */
    moveToLevel(trainingRunId: number, levelId: number): Observable<Level> {
        return this.http
            .get<AbstractLevelDTO>(`${this.trainingRunsEndpointUri}/${trainingRunId}/levels/${levelId}`)
            .pipe(map((response) => AnsweredLevelMapper.fromDTO(response)));
    }
}
