import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import {
    AccessPhase,
    InfoPhase,
    Phase,
    QuestionnairePhase,
    Task,
    TrainingDefinition,
    TrainingDefinitionInfo,
    TrainingDefinitionStateEnum,
    TrainingPhase,
} from '@crczp/training-model';

export abstract class AdaptiveDefinitionApiService {
    abstract getAll(
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<TrainingDefinition>>;

    abstract getAllForOrganizer(
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<TrainingDefinitionInfo>>;

    abstract get(id: number, withPhases?: boolean): Observable<TrainingDefinition>;

    abstract changeState(trainingDefinitionId: number, newState: TrainingDefinitionStateEnum): Observable<any>;

    abstract download(id: number): Observable<boolean>;

    abstract upload(file: File): Observable<TrainingDefinition>;

    abstract delete(id: number): Observable<any>;

    abstract clone(id: number, title: string): Observable<number>;

    abstract update(trainingDefinition: TrainingDefinition): Observable<number>;

    abstract create(trainingDefinition: TrainingDefinition): Observable<TrainingDefinition>;

    abstract createInfoPhase(trainingDefinitionId: number): Observable<InfoPhase>;

    abstract createTrainingPhase(trainingDefinitionId: number): Observable<TrainingPhase>;

    abstract createAccessPhase(trainingDefinitionId: number): Observable<AccessPhase>;

    abstract createAdaptiveQuestionnairePhase(trainingDefinitionId: number): Observable<QuestionnairePhase>;

    abstract createGeneralQuestionnairePhase(trainingDefinitionId: number): Observable<QuestionnairePhase>;

    abstract getPhase(trainingDefinitionId: number, phaseId: number): Observable<Phase>;

    abstract deletePhase(trainingDefinitionId: number, phaseId: number): Observable<any>;

    abstract updatePhases(trainingDefinitionId: number, phases: Phase[]): Observable<any>;

    abstract updateTrainingPhase(trainingDefinitionId: number, trainingPhase: TrainingPhase): Observable<any>;

    abstract updateQuestionnairePhase(
        trainingDefinitionId: number,
        questionnairePhase: QuestionnairePhase,
    ): Observable<QuestionnairePhase>;

    abstract updateInfoPhase(trainingDefinitionId: number, infoPhase: InfoPhase): Observable<any>;

    abstract movePhaseTo(trainingDefinitionId: number, phaseId: number, newPosition: number): Observable<any>;

    abstract moveTaskTo(
        trainingDefinitionId: number,
        phaseId: number,
        taskId: number,
        newPosition: number,
    ): Observable<any>;

    abstract createTask(trainingDefinitionId: number, trainingPhaseId: number): Observable<Task>;

    abstract cloneTask(trainingDefinitionId: number, trainingPhaseId: number, clonedTask: Task): Observable<Task>;

    abstract deleteTask(trainingDefinitionId: number, trainingPhaseId: number, taskId: number): Observable<any>;

    abstract getTask(trainingDefinitionId: number, trainingPhaseId: number, taskId: number): Observable<Phase>;

    abstract updateTask(trainingDefinitionId: number, trainingPhaseId: number, task: Task): Observable<any>;
}
