import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { EMPTY, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { PhaseEditService } from './phase-edit.service';
import { AdaptiveTrainingDefinitionApi } from '@crczp/training-api';
import {
    AbstractPhaseTypeEnum,
    AccessPhase,
    AdaptiveTask,
    InfoPhase,
    Phase,
    QuestionnairePhase,
    QuestionnaireTypeEnum,
    TrainingPhase,
} from '@crczp/training-model';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';

@Injectable()
export class PhaseEditConcreteService extends PhaseEditService {
    private api = inject(AdaptiveTrainingDefinitionApi);
    private dialog = inject(MatDialog);
    private errorHandler = inject(ErrorHandlerService);
    private notificationService = inject(NotificationService);

    private unsavedTasks: number[] = [];

    set(trainingDefinitionId: number, phases: Phase[]): void {
        this.trainingDefinitionId = trainingDefinitionId;
        this.phasesSubject$.next(phases);
        this.updatePresentTrainingPhases();
        if (phases.length != 0) {
            this.updateActiveTasks();
        }
    }

    setActivePhase(phaseIndex: number): void {
        this.activeStepSubject$.next(phaseIndex);
        if (
            this.phasesSubject$.value.length > 0 &&
            this.getSelected().type === AbstractPhaseTypeEnum.Training
        ) {
            this.activeTaskStepSubject$.next(0);
            this.updateActiveTasks();
        }
    }

    getPhasesCount(): number {
        return this.phasesSubject$.getValue().length;
    }

    /**
     * Performs necessary actions to initiate and update values related to active phases change
     * @param phase new active phases
     */
    onActivePhaseChanged(phase: Phase): void {
        phase.isUnsaved = true;
        const newPhases = this.phasesSubject$.getValue();
        newPhases[this.activeStepSubject$.getValue()] = phase;
        this.phasesSubject$.next(newPhases);
        this.phasesValidSubject$.next(phase.valid);
        this.saveDisabledSubject$.next(!phase.valid);
        this.emitUnsavedPhases();
    }

    onActiveTaskChanged(task: AdaptiveTask): void {
        task.isUnsaved = true;
        this.getSelected().isUnsaved = true;
        const newPhases = this.phasesSubject$.getValue();
        (newPhases[this.activeStepSubject$.getValue()] as TrainingPhase).tasks[
            task.order
        ] = task;
        this.saveDisabledSubject$.next(!task.valid);
        this.updateActiveTasks();
        this.emitUnsavedTasks(task.id);
        this.emitUnsavedPhases();
    }

    navigateToLastPhase(): void {
        this.setActivePhase(this.phasesSubject$.getValue().length - 1);
    }

    navigateToPreviousPhase(): void {
        const curr = this.activeStepSubject$.getValue();
        if (curr > 0) {
            this.setActivePhase(curr - 1);
        } else {
            this.setActivePhase(0);
        }
    }

    navigateToPreviousTask(): void {
        const curr = this.activeTaskStepSubject$.getValue();
        if (curr > 0) {
            this.setActiveTask(curr - 1);
        } else {
            this.setActiveTask(0);
        }
    }

    add(
        phaseType: AbstractPhaseTypeEnum,
        questionnaireType?: QuestionnaireTypeEnum
    ): Observable<Phase> {
        let added$: Observable<Phase>;
        switch (phaseType) {
            case AbstractPhaseTypeEnum.Info: {
                added$ = this.addInfoPhase();
                break;
            }
            case AbstractPhaseTypeEnum.Training: {
                added$ = this.addTrainingPhase();
                break;
            }
            case AbstractPhaseTypeEnum.Questionnaire: {
                added$ = this.addQuestionnairePhase(questionnaireType);
                break;
            }
            case AbstractPhaseTypeEnum.Access: {
                added$ = this.addAccessPhase();
                break;
            }
            default:
                console.error(
                    'Unsupported type of phases in add method od PhaseEditService'
                );
        }
        return added$.pipe(tap(() => this.navigateToLastPhase()));
    }

    saveUnsavedPhases(): Observable<any> {
        if (this.unsavedPhasesSubject$.getValue().length > 0) {
            const phases: Phase[] = this.unsavedPhasesSubject$.getValue();
            this.unsavedPhasesSubject$.getValue().forEach((phase, index) => {
                if (phase.type === AbstractPhaseTypeEnum.Training) {
                    (phases[index] as TrainingPhase).tasks = (
                        phase as TrainingPhase
                    ).tasks.filter((task) =>
                        this.unsavedTasks.includes(task.id)
                    );
                }
            });
            return this.sendRequestToSavePhases(
                this.unsavedPhasesSubject$.getValue()
            ).pipe(
                tap(
                    () => {
                        this.onPhasesSaved();
                        this.notificationService.emit(
                            'success',
                            'Phases have been saved'
                        );
                    },
                    (err) =>
                        this.errorHandler.emit(
                            err,
                            'Saving phases in adaptive training definition'
                        )
                )
            );
        } else {
            return EMPTY;
        }
    }

    deleteSelected(): Observable<any> {
        const phase = this.getSelected();
        return this.displayDialogToDeletePhase(phase).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDeletePhase(phase)
                    : EMPTY
            )
        );
    }

    deleteTask(): Observable<any> {
        const task = this.getSelectedTask();
        return this.displayDialogToDeleteTask(task).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDeleteTask(task.id)
                    : EMPTY
            )
        );
    }

    move(fromIndex: number, toIndex: number): void {
        const phases = this.phasesSubject$.getValue();
        const from = phases[fromIndex];
        if (from.type === AbstractPhaseTypeEnum.Training) {
            this.displayDialogToMoveTrainingPhase(from)
                .pipe(
                    switchMap((result) => {
                        if (result === SentinelDialogResultEnum.CONFIRMED) {
                            return this.callApiToMove(
                                fromIndex,
                                toIndex,
                                from.id
                            );
                        } else {
                            this.moveRollback(fromIndex);
                        }
                    })
                )
                .subscribe();
        } else {
            this.callApiToMove(fromIndex, toIndex, from.id).subscribe();
        }
    }

    addTask(): Observable<AdaptiveTask> {
        const phaseId = this.getSelected().id;
        return this.api.createTask(this.trainingDefinitionId, phaseId).pipe(
            tap(
                (task) => this.onTaskAdded(task),
                (err) => this.errorHandler.emit(err, 'Adding task')
            )
        );
    }

    moveTasks(fromIndex: number, toIndex: number): void {
        const phaseId = this.getSelected().id;
        const tasks = (
            this.phasesSubject$.getValue()[
                this.activeStepSubject$.getValue()
            ] as TrainingPhase
        ).tasks;
        const from = tasks[fromIndex];
        this.moveTasksInternally(fromIndex, toIndex);
        this.api
            .moveTaskTo(this.trainingDefinitionId, phaseId, from.id, toIndex)
            .pipe(
                tap(() => {
                    this.updateActiveTasks();
                })
            )
            .subscribe();
    }

    setActiveTask(index: number): void {
        this.activeTaskStepSubject$.next(index);
    }

    cloneTask(): Observable<AdaptiveTask> {
        const phaseId = this.getSelected().id;
        const clonedTask = this.getSelectedTask();
        return this.api
            .cloneTask(this.trainingDefinitionId, phaseId, clonedTask)
            .pipe(
                tap(
                    (task) => this.onTaskAdded(task),
                    (err) => this.errorHandler.emit(err, 'Cloning task')
                )
            );
    }

    private getSelected(): Phase {
        return this.phasesSubject$.getValue()[
            this.activeStepSubject$.getValue()
        ];
    }

    private getSelectedTask(): AdaptiveTask {
        return this.activeTasksSubject$.getValue()[
            this.activeTaskStepSubject$.getValue()
        ];
    }

    private addInfoPhase(): Observable<InfoPhase> {
        return this.api.createInfoPhase(this.trainingDefinitionId).pipe(
            tap(
                (phase) => this.onPhaseAdded(phase),
                (err) => this.errorHandler.emit(err, 'Adding info phase')
            )
        );
    }

    private addTrainingPhase(): Observable<TrainingPhase> {
        return this.api.createTrainingPhase(this.trainingDefinitionId).pipe(
            tap(
                (phase) => {
                    this.onPhaseAdded(phase);
                    this.presentTrainingPhasesSubject$.next([
                        ...this.presentTrainingPhasesSubject$.getValue(),
                        phase,
                    ]);
                },
                (err) => this.errorHandler.emit(err, 'Adding training phase')
            )
        );
    }

    private addAccessPhase(): Observable<AccessPhase> {
        return this.api.createAccessPhase(this.trainingDefinitionId).pipe(
            tap(
                (phase) => {
                    this.onPhaseAdded(phase);
                },
                (err) => this.errorHandler.emit(err, 'Adding access phase')
            )
        );
    }

    private addQuestionnairePhase(
        questionnaireType: QuestionnaireTypeEnum
    ): Observable<QuestionnairePhase> {
        switch (questionnaireType) {
            case QuestionnaireTypeEnum.Adaptive: {
                return this.api
                    .createAdaptiveQuestionnairePhase(this.trainingDefinitionId)
                    .pipe(
                        tap(
                            (phase) => {
                                this.onPhaseAdded(phase);
                            },
                            (err) =>
                                this.errorHandler.emit(
                                    err,
                                    'Adding adaptive questionnaire phase'
                                )
                        )
                    );
            }
            case QuestionnaireTypeEnum.General: {
                return this.api
                    .createGeneralQuestionnairePhase(this.trainingDefinitionId)
                    .pipe(
                        tap(
                            (phase) => {
                                this.onPhaseAdded(phase);
                            },
                            (err) =>
                                this.errorHandler.emit(
                                    err,
                                    'Adding general questionnaire phase'
                                )
                        )
                    );
            }
        }
    }

    private displayDialogToDeletePhase(
        phase: Phase
    ): Observable<SentinelDialogResultEnum> {
        let matrixWarn = '';
        if (phase.type === AbstractPhaseTypeEnum.Training) {
            matrixWarn =
                ' This might affect data in subsequent decision matrices.';
        }
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Phase',
                    `Do you want to delete phase "${phase.title}"?` +
                        matrixWarn,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private displayDialogToMoveTrainingPhase(
        phase: Phase
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Move Training Phase',
                    `Do you want to move phase "${phase.title}"? This might affect data in subsequent decision matrices.`,
                    'Cancel',
                    'Move'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private displayDialogToDeleteTask(
        task: AdaptiveTask
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Task',
                    `Do you want to delete task "${task.title}"?`,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private callApiToDeletePhase(phase: Phase): Observable<any> {
        return this.api.deletePhase(this.trainingDefinitionId, phase.id).pipe(
            tap(
                () => {
                    this.onPhaseDeleted(phase.id);
                },
                (err) =>
                    this.errorHandler.emit(err, `Deleting phase ${phase.title}`)
            )
        );
    }

    private callApiToDeleteTask(taskId: number): Observable<any> {
        const phaseId = this.getSelected().id;
        return this.api
            .deleteTask(this.trainingDefinitionId, phaseId, taskId)
            .pipe(
                tap(
                    () => {
                        this.onTaskDeleted(taskId);
                    },
                    (err) => this.errorHandler.emit(err, 'Deleting task')
                )
            );
    }

    private sendRequestToSavePhases(phases: Phase[]): Observable<any> {
        return this.api.updatePhases(this.trainingDefinitionId, phases);
    }

    private onPhaseAdded(phase: Phase): void {
        this.phasesSubject$.next([...this.phasesSubject$.getValue(), phase]);
    }

    private onPhasesSaved(): void {
        this.unsavedPhasesSubject$.getValue().forEach((phase) => {
            phase.isUnsaved = false;
            phase.valid = true;
        });
        this.unsavedTasks = [];
        this.saveDisabledSubject$.next(true);
        this.emitUnsavedPhases();
    }

    private onPhaseDeleted(deletedId: number): void {
        if (this.getSelected().type === AbstractPhaseTypeEnum.Training) {
            this.presentTrainingPhasesSubject$.next(
                this.presentTrainingPhasesSubject$
                    .getValue()
                    .filter((trainingPhase) => trainingPhase.id !== deletedId)
            );
            this.updateRelations(deletedId);
        }
        this.phasesSubject$.next(
            this.phasesSubject$
                .getValue()
                .filter((phase) => phase.id !== deletedId)
        );
        this.updateMatrices();
        this.navigateToPreviousPhase();
    }

    private onTaskAdded(task: AdaptiveTask): void {
        (
            this.phasesSubject$.getValue()[
                this.activeStepSubject$.getValue()
            ] as TrainingPhase
        ).tasks.push(task);
        this.updateActiveTasks();
    }

    private onTaskDeleted(id: number): void {
        (
            this.phasesSubject$.getValue()[
                this.activeStepSubject$.getValue()
            ] as TrainingPhase
        ).tasks = (
            this.phasesSubject$.getValue()[
                this.activeStepSubject$.getValue()
            ] as TrainingPhase
        ).tasks.filter((task) => task.id !== id);
        this.navigateToPreviousTask();
        // this.unsavedTasks.filter(taskId => taskId !== id);
        this.updateActiveTasks();
    }

    private emitUnsavedPhases(): void {
        this.unsavedPhasesSubject$.next(
            this.phasesSubject$.getValue().filter((phase) => phase.isUnsaved)
        );
    }

    private emitUnsavedTasks(taskId: number): void {
        if (!this.unsavedTasks.includes(taskId)) {
            this.unsavedTasks.push(taskId);
        }
    }

    private callApiToMove(
        fromIndex: number,
        toIndex: number,
        phaseId: number
    ): Observable<any> {
        this.moveInternally(fromIndex, toIndex);
        return this.api
            .movePhaseTo(this.trainingDefinitionId, phaseId, toIndex)
            .pipe(
                tap(() => {
                    this.updateOrder();
                    this.updateMatrices();
                    this.updateActiveTasks();
                    this.updatePresentTrainingPhases();
                })
            );
    }

    private moveInternally(fromIndex: number, toIndex: number): void {
        const phases = this.phasesSubject$.getValue();
        phases.splice(toIndex, 0, phases.splice(fromIndex, 1)[0]);
        this.phasesSubject$.next(phases);
    }

    private moveTasksInternally(fromIndex: number, toIndex: number): void {
        const tasks = (
            this.phasesSubject$.getValue()[
                this.activeStepSubject$.getValue()
            ] as TrainingPhase
        ).tasks;
        tasks.splice(toIndex, 0, tasks.splice(fromIndex, 1)[0]);
        tasks.forEach((phase, index) => (phase.order = index));
        (
            this.phasesSubject$.getValue()[
                this.activeStepSubject$.getValue()
            ] as TrainingPhase
        ).tasks = tasks;
    }

    private moveRollback(fromIndex: number): void {
        const phases = this.phasesSubject$.getValue();
        this.phasesSubject$.next(phases.sort((a, b) => a.order - b.order));
        this.setActivePhase(fromIndex);
    }

    private updateMatrices(): void {
        const phases = this.phasesSubject$.getValue();
        phases.forEach((phase) => {
            if (phase.type === AbstractPhaseTypeEnum.Training) {
                this.api
                    .getPhase(this.trainingDefinitionId, phase.id)
                    .subscribe((val) => {
                        (phase as TrainingPhase).decisionMatrix = (
                            val as TrainingPhase
                        ).decisionMatrix;
                        this.phasesSubject$.next(phases);
                        this.updateMatrixSubject$.next(
                            !this.updateMatrixSubject$.getValue()
                        );
                    });
            }
        });
    }

    private updateRelations(deletedId: number) {
        const updated = this.phasesSubject$.value;
        updated.forEach((phase) => {
            if (phase.type === AbstractPhaseTypeEnum.Questionnaire) {
                (phase as QuestionnairePhase).phaseRelations = (
                    phase as QuestionnairePhase
                ).phaseRelations.filter(
                    (relation) => relation.phaseId !== deletedId
                );
            }
        });
        this.phasesSubject$.next(updated);
    }

    private updateOrder(): void {
        const phases = this.phasesSubject$.getValue();
        phases.forEach((phase, index) => (phase.order = index));
    }

    private updateActiveTasks(): void {
        this.activeTasksSubject$.next(
            (this.getSelected() as TrainingPhase).tasks
        );
    }

    private updatePresentTrainingPhases(): void {
        this.presentTrainingPhasesSubject$.next(
            this.phasesSubject$.value.filter(
                (phase) => phase.type === AbstractPhaseTypeEnum.Training
            ) as TrainingPhase[]
        );
    }
}
