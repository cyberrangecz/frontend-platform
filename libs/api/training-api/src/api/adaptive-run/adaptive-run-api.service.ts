import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {Observable} from 'rxjs';
import {
    AccessedTrainingRun,
    AccessTrainingRunInfo,
    Phase,
    PhaseAnswerCheck,
    QuestionAnswer,
    TrainingRun,
} from '@crczp/training-model';

export abstract class AdaptiveRunApi {
    abstract getAll(
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<TrainingRun>>;

    abstract get(id: number): Observable<TrainingRun>;

    abstract getAccessed(pagination: OffsetPaginationEvent): Observable<PaginatedResource<AccessedTrainingRun>>;

    abstract delete(trainingRunId: number, force?: boolean): Observable<any>;

    abstract deleteMultiple(trainingRunIds: number[], force?: boolean): Observable<any>;

    abstract access(token: string): Observable<AccessTrainingRunInfo>;

    abstract resume(trainingRunId: number): Observable<AccessTrainingRunInfo>;

    abstract nextPhase(trainingRunId: number): Observable<Phase>;

    abstract isCorrectAnswer(trainingRunId: number, answer: string): Observable<PhaseAnswerCheck>;

    abstract isCorrectPasskey(trainingRunId: number, passkey: string): Observable<boolean>;

    abstract takeSolution(trainingRunId: number): Observable<string>;

    abstract evaluateQuestionnaire(trainingRunId: number, questionAnswers: QuestionAnswer[]): Observable<any>;

    abstract finish(trainingRunId: number): Observable<any>;

    abstract archive(trainingRunId: number): Observable<any>;

    abstract moveToPhase(trainingRunId: number, phaseId: number): Observable<Phase>;
}
