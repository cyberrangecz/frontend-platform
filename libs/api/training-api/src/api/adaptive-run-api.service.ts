import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SentinelParamsMerger } from '@sentinel/common';
import {
    JavaPaginatedResource,
    OffsetPaginatedResource,
    PaginationMapper,
    ParamsBuilder,
    QueryParam,
} from '@crczp/api-common';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import {
    AccessedTrainingRun,
    AccessTrainingRunInfo,
    Phase,
    PhaseAnswerCheck,
    QuestionAnswer,
    TrainingRun,
} from '@crczp/training-model';
import { map } from 'rxjs/operators';
import { TrainingRunDTO } from '../dto/training-run/training-run-dto';
import { AccessTrainingRunDTO } from '../dto/training-run/access-training-run-dto';
import { AdaptiveRunMapper } from '../mappers/training-run/adaptive-run-mapper';
import { AccessedAdaptiveRunMapper } from '../mappers/training-run/accessed-adaptive-run-mapper';
import { AccessAdaptiveRunMapper } from '../mappers/training-run/access-adaptive-run-mapper';
import { AbstractPhaseDTO } from '../dto/phase/abstract-phase-dto';
import { PhaseMapper } from '../mappers/phase/phase-mapper';
import { IsCorrectAnswerDTO } from '../dto/phase/training-phase/is-correct-answer-dto';
import { TaskAnswerMapper } from '../mappers/training-run/task-answer-mapper';
import { QuestionAnswerMapper } from '../mappers/phase/question-answer-mapper';
import { AnsweredPhaseMapper } from '../mappers/training-run/training-run-phases/answered-phase-mapper';
import { PortalConfig } from '@crczp/utils';
import { AccessedTrainingRunSort, TrainingRunSort } from './sorts';

@Injectable()
export class AdaptiveRunApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl =
        inject(PortalConfig).basePaths.adaptiveTraining + '/training-runs';

    getAll(
        pagination: OffsetPaginationEvent<TrainingRunSort>,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<TrainingRun>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<JavaPaginatedResource<TrainingRunDTO>>(this.apiUrl, { params })
            .pipe(
                map(
                    (response) =>
                        new OffsetPaginatedResource<TrainingRun>(
                            AdaptiveRunMapper.fromDTOs(response.content),
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
            .get<TrainingRunDTO>(`${this.apiUrl}/${id}`)
            .pipe(map((response) => AdaptiveRunMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve training run already accessed by logged in user
     * @param pagination requested pagination
     */
    getAccessed(
        pagination: OffsetPaginationEvent<AccessedTrainingRunSort>,
    ): Observable<OffsetPaginatedResource<AccessedTrainingRun>> {
        return this.http
            .get<JavaPaginatedResource<TrainingRunDTO>>(
                `${this.apiUrl}/accessible`,
                {
                    params: ParamsBuilder.javaPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new OffsetPaginatedResource<AccessedTrainingRun>(
                            AccessedAdaptiveRunMapper.fromDTOs(
                                response.content,
                            ),
                            PaginationMapper.fromJavaDTO(response.pagination),
                        ),
                ),
            );
    }

    /**
     * Sends http request to delete training run
     * @param trainingRunId id of a training run which should be deleted
     * @param force true if delete should be forced, false otherwise
     */
    delete(trainingRunId: number, force = false): Observable<any> {
        const params = new HttpParams().append('forceDelete', force.toString());
        return this.http.delete(`${this.apiUrl}/${trainingRunId}`, { params });
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
        return this.http.delete(this.apiUrl, { params });
    }

    /**
     * Sends http request to access training run with access token.
     * @param token access token to access the training run
     */
    access(token: string): Observable<AccessTrainingRunInfo> {
        const params = new HttpParams().append('accessToken', token);
        return this.http
            .post<AccessTrainingRunDTO>(this.apiUrl, {}, { params })
            .pipe(map((response) => AccessAdaptiveRunMapper.fromDTO(response)));
    }

    /**
     * Sends http request to resume in training run
     * @param trainingRunId id of a training run to resume
     */
    resume(trainingRunId: number): Observable<AccessTrainingRunInfo> {
        return this.http
            .get<AccessTrainingRunDTO>(
                `${this.apiUrl}/${trainingRunId}/resumption`,
            )
            .pipe(map((response) => AccessAdaptiveRunMapper.fromDTO(response)));
    }

    nextPhase(trainingRunId: number): Observable<Phase> {
        return this.http
            .get<AbstractPhaseDTO>(
                `${this.apiUrl}/${trainingRunId}/next-phases`,
            )
            .pipe(map((response) => PhaseMapper.fromDTO(response)));
    }

    isCorrectAnswer(
        trainingRunId: number,
        answer: string,
    ): Observable<PhaseAnswerCheck> {
        return this.http
            .post<IsCorrectAnswerDTO>(
                `${this.apiUrl}/${trainingRunId}/is-correct-answer`,
                { answer },
            )
            .pipe(map((response) => TaskAnswerMapper.fromDTO(response)));
    }

    isCorrectPasskey(
        trainingRunId: number,
        passkey: string,
    ): Observable<boolean> {
        return this.http.post<boolean>(
            `${this.apiUrl}/${trainingRunId}/is-correct-passkey`,
            {
                passkey,
            },
        );
    }

    /**
     * Sends http request to display solution to a level
     * @param trainingRunId id of the training run in which, solution should be revealed
     */
    takeSolution(trainingRunId: number): Observable<string> {
        return this.http.get(`${this.apiUrl}/${trainingRunId}/solutions`, {
            responseType: 'text',
        });
    }

    evaluateQuestionnaire(
        trainingRunId: number,
        questionAnswers: QuestionAnswer[],
    ): Observable<any> {
        return this.http.put(
            `${this.apiUrl}/${trainingRunId}/questionnaire-evaluation`,
            {
                answers: QuestionAnswerMapper.toDTOs(questionAnswers),
            },
        );
    }

    /**
     * Sends http request to finish active training run
     * @param trainingRunId id of a training run which should be finished
     */
    finish(trainingRunId: number): Observable<any> {
        return this.http.put(`${this.apiUrl}/${trainingRunId}`, null);
    }

    /**
     * Sends http request to archive training run
     * @param trainingRunId id of a training run which should be archived
     */
    archive(trainingRunId: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${trainingRunId}/archive`, null);
    }

    /**
     * Sends http request to move to specified finished phase
     * @param trainingRunId id of a training run in which phase should be accessed
     * @param levelId id of a phase, which to be switched to
     */
    moveToPhase(trainingRunId: number, phaseId: number): Observable<Phase> {
        return this.http
            .get<AbstractPhaseDTO>(
                `${this.apiUrl}/${trainingRunId}/phases/${phaseId}`,
            )
            .pipe(map((response) => AnsweredPhaseMapper.fromDTO(response)));
    }
}
