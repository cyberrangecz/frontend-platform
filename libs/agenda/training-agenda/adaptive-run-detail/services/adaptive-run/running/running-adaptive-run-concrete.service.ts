import { inject, Injectable } from '@angular/core';
import { RunningAdaptiveRunService } from './running-adaptive-run.service';
import { EMPTY, Observable } from 'rxjs';
import {
    AbstractPhaseTypeEnum,
    AccessTrainingRunInfo,
    Phase,
    QuestionAnswer,
} from '@crczp/training-model';
import { AdaptiveRunApi } from '@crczp/training-api';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ErrorHandlerService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { LoadingDialogComponent, LoadingDialogConfig } from '@crczp/components';

@Injectable()
export class RunningAdaptiveRunConcreteService extends RunningAdaptiveRunService {
    private api = inject(AdaptiveRunApi);
    private errorHandler = inject(ErrorHandlerService);
    private router = inject(Router);
    private dialog = inject(MatDialog);

    private activePhases: Phase[] = [];
    private startTime: Date;
    private isStepperDisplayed: boolean;
    private backwardMode: boolean;

    init(accessAdaptiveRunInfo: AccessTrainingRunInfo): void {
        this.trainingRunId = accessAdaptiveRunInfo.trainingRunId;
        this.sandboxInstanceId = accessAdaptiveRunInfo.sandboxInstanceId;
        this.sandboxDefinitionId = accessAdaptiveRunInfo.sandboxDefinitionId;
        this.localEnvironment = accessAdaptiveRunInfo.localEnvironment;
        this.isStepperDisplayed = accessAdaptiveRunInfo.isStepperDisplayed;
        this.backwardMode = accessAdaptiveRunInfo.backwardMode;
        this.startTime = accessAdaptiveRunInfo.startTime;
        this.activePhases = accessAdaptiveRunInfo.levels as Phase[];
        this.isCurrentPhaseAnsweredSubject$.next(
            accessAdaptiveRunInfo.isLevelAnswered
        );
        this.setActivePhase(accessAdaptiveRunInfo.currentLevel as Phase);
    }

    getPhases(): Phase[] {
        return this.activePhases;
    }

    getActivePhasePosition(): number {
        return this.activePhases.findIndex(
            (phase) => phase.id === this.getActivePhase()?.id
        );
    }

    getBacktrackedPhasePosition(): number {
        return this.activePhases.findIndex(
            (phase) => phase.id === this.getBacktrackedPhase().id
        );
    }

    getActivePhase(): Phase {
        return this.activePhaseSubject$.getValue();
    }

    getBacktrackedPhase(): Phase {
        return this.backtrackedPhaseSubject$.getValue();
    }

    getStartTime(): Date {
        return this.startTime;
    }

    getBackwardMode(): boolean {
        return this.backwardMode;
    }

    getIsStepperDisplayed(): boolean {
        return this.isStepperDisplayed;
    }

    next(): Observable<any> {
        return this.isLast()
            ? this.callApiToFinish()
            : this.callApiToNextLevel();
    }

    moveToPhase(phaseId: number): Observable<Phase> {
        return this.api.moveToPhase(this.trainingRunId, phaseId).pipe(
            tap(
                (level) => this.setBacktrackedPhase(level),
                (err) => this.errorHandler.emit(err, 'Moving to next level')
            )
        );
    }

    isLast(): boolean {
        return (
            this.getActivePhase()?.id ===
            this.activePhases[this.activePhases.length - 1].id
        );
    }

    clear(): void {
        this.trainingRunId = undefined;
        this.sandboxInstanceId = undefined;
        this.sandboxDefinitionId = undefined;
        this.localEnvironment = undefined;
        this.startTime = undefined;
        this.activePhaseSubject$.next(undefined);
        this.activePhases = [];
    }

    submitQuestionnaire(answers: QuestionAnswer[]): Observable<any> {
        return this.api.evaluateQuestionnaire(this.trainingRunId, answers).pipe(
            tap(
                (_) => _,
                (err) => this.errorHandler.emit(err, 'Submitting answers')
            ),
            switchMap(() => this.next())
        );
    }

    private setActivePhase(phase: Phase) {
        this.activePhaseSubject$.next(phase);
    }

    private setBacktrackedPhase(phase: Phase) {
        this.backtrackedPhaseSubject$.next(phase);
    }

    private callApiToFinish(): Observable<any> {
        return this.api.finish(this.trainingRunId).pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emit(err, 'Finishing training'),
            }),
            switchMap(() => {
                const dialog = this.displayLoadingDialog();
                const tmpTrainingRunId = this.trainingRunId;
                setTimeout(() => {
                    dialog.close();
                    this.router.navigate([
                        Routing.RouteBuilder.run.adaptive.runId(
                            tmpTrainingRunId
                        ).results,
                    ]);
                }, 3000);
                return EMPTY;
            }),
            tap(() => this.clear())
        );
    }

    private callApiToNextLevel(): Observable<Phase> {
        const phaseOrder = this.getActivePhase().order;
        if (
            this.activePhases[phaseOrder + 1].type ===
            AbstractPhaseTypeEnum.Training
        ) {
            const dialogRef = this.displayDialogToNextTask();
            return this.api.nextPhase(this.trainingRunId).pipe(
                tap(
                    (phase) => {
                        dialogRef.close();
                        this.isCurrentPhaseAnsweredSubject$.next(false);
                        this.setActivePhase(phase);
                    },
                    (err) => {
                        dialogRef.close();
                        this.errorHandler.emit(err, 'Moving to next phase');
                    }
                )
            );
        } else {
            return this.api.nextPhase(this.trainingRunId).pipe(
                tap(
                    (phase) => {
                        this.isCurrentPhaseAnsweredSubject$.next(false);
                        this.setActivePhase(phase);
                    },
                    (err) => this.errorHandler.emit(err, 'Moving to next phase')
                )
            );
        }
    }

    private displayDialogToNextTask(): MatDialogRef<LoadingDialogComponent> {
        return this.dialog.open(LoadingDialogComponent, {
            data: new LoadingDialogConfig(
                'Choosing a suitable task for you',
                `Please wait while your next task is being prepared`
            ),
        });
    }

    private displayLoadingDialog(): MatDialogRef<LoadingDialogComponent> {
        return this.dialog.open(LoadingDialogComponent, {
            data: new LoadingDialogConfig(
                'Processing training data for visualization',
                `Please wait while your training data are being processed`
            ),
        });
    }
}
