/**
 * Service handling editing of training-training-phase definition's levels and related operations.
 * Serves as a layer between component and API service
 * Subscribe to levels$, activeStep$ and activeLevelCanBeSaved$ to receive latest data updates.
 */
import { BehaviorSubject, Observable } from 'rxjs';
import { AbstractPhaseTypeEnum, Phase, QuestionnaireTypeEnum, Task, TrainingPhase } from '@crczp/training-model';

export abstract class PhaseEditService {
    protected trainingDefinitionId: number;

    protected phasesSubject$: BehaviorSubject<Phase[]> = new BehaviorSubject([]);
    phases$ = this.phasesSubject$.asObservable();

    protected activeTasksSubject$: BehaviorSubject<Task[]> = new BehaviorSubject([]);
    activeTasks$ = this.activeTasksSubject$.asObservable();

    protected activeTaskStepSubject$: BehaviorSubject<number> = new BehaviorSubject(0);
    activeTaskStep$ = this.activeTaskStepSubject$.asObservable();

    protected activeStepSubject$: BehaviorSubject<number> = new BehaviorSubject(0);
    activeStep$ = this.activeStepSubject$.asObservable();

    protected updateMatrixSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    updateMatrix$ = this.updateMatrixSubject$.asObservable();

    protected updateQuestionsFlagSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    updateQuestionsFlag$ = this.updateQuestionsFlagSubject$.asObservable();

    protected saveDisabledSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    saveDisabled$: Observable<boolean> = this.saveDisabledSubject$.asObservable();

    protected phasesValidSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if all phases are valid, false otherwise
     */
    phasesValid$: Observable<boolean> = this.phasesValidSubject$.asObservable();

    protected questionnairePresentSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    questionnairePresent$ = this.questionnairePresentSubject$.asObservable();

    protected presentTrainingPhasesSubject$: BehaviorSubject<TrainingPhase[]> = new BehaviorSubject([]);
    presentTrainingPhases$ = this.presentTrainingPhasesSubject$.asObservable();

    protected unsavedPhasesSubject$: BehaviorSubject<Phase[]> = new BehaviorSubject([]);
    unsavedPhases$: Observable<Phase[]> = this.unsavedPhasesSubject$.asObservable();

    abstract set(trainingDefinitionId: number, phases: Phase[]): void;

    abstract getPhasesCount(): number;

    abstract setActivePhase(phaseIndex: number): void;

    /**
     * Performs necessary actions to initiate and update values related to active phases change
     * @param phase new active phases
     */
    abstract onActivePhaseChanged(phase: Phase): void;

    abstract navigateToLastPhase(): void;

    abstract navigateToPreviousPhase(): void;

    abstract add(phaseType: AbstractPhaseTypeEnum, questionnaireType?: QuestionnaireTypeEnum): Observable<Phase>;

    /**
     * Saves changes in edited phases and optionally informs on result of the operation
     */
    abstract saveUnsavedPhases(): Observable<any>;

    /**
     * Displays dialog to delete selected phases and displays alert with result of the operation
     */
    abstract deleteSelected(): Observable<any>;

    /**
     * Moves phases from index to a new one. Updates optimistically and rollback is performed on error
     * @param fromIndex current index of phases
     * @param toIndex new index of phases
     */
    abstract move(fromIndex: number, toIndex: number): void;

    abstract addTask(): Observable<Task>;

    abstract cloneTask(): Observable<Task>;

    abstract deleteTask(): Observable<any>;

    abstract onActiveTaskChanged(task: Task): void;

    abstract setActiveTask(index: number): void;

    abstract moveTasks(fromIndex: number, toIndex: number): void;
}
