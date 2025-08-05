import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LinearRunApi } from '@crczp/training-api';
import { AccessTrainingRunInfo, Level } from '@crczp/training-model';
import { EMPTY, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { RunningTrainingRunService } from './running-training-run.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ErrorHandlerService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { LoadingDialogComponent, LoadingDialogOptions } from '@crczp/components';

/**
 * Main service for running training training. Holds levels and its state. Handles user general training run user actions and events.
 * Subscribe to activeLevel$ to receive latest data updates.
 */
@Injectable()
export class RunningTrainingRunConcreteService extends RunningTrainingRunService {
    private api = inject(LinearRunApi);
    private errorHandler = inject(ErrorHandlerService);
    private router = inject(Router);
    private dialog = inject(MatDialog);

    private activeLevels: Level[] = [];
    private startTime: Date;
    private isStepperDisplayed: boolean;
    private backwardMode: boolean;

    /**
     * Initializes the service from training run access info
     * @param trainingRunInfo
     */
    init(trainingRunInfo: AccessTrainingRunInfo): void {
        this.trainingRunId = trainingRunInfo.trainingRunId;
        this.sandboxInstanceId = trainingRunInfo.sandboxInstanceId;
        this.sandboxDefinitionId = trainingRunInfo.sandboxDefinitionId;
        this.localEnvironment = trainingRunInfo.localEnvironment;
        this.isStepperDisplayed = trainingRunInfo.isStepperDisplayed;
        this.startTime = trainingRunInfo.startTime;
        this.activeLevels = trainingRunInfo.levels as Level[];
        this.setActiveLevel(trainingRunInfo.currentLevel as Level);
        this.backwardMode = trainingRunInfo.backwardMode;
        this.isCurrentLevelAnsweredSubject$.next(
            trainingRunInfo.isLevelAnswered
        );
    }

    getLevels(): Level[] {
        return this.activeLevels;
    }

    getActiveLevel(): Level {
        return this.activeLevelSubject$.getValue();
    }

    getActiveLevelPosition(): number {
        return this.activeLevels.findIndex(
            (level) => level?.id === this.getActiveLevel()?.id
        );
    }

    getStartTime(): Date {
        return this.startTime;
    }

    getIsStepperDisplayed(): boolean {
        return this.isStepperDisplayed;
    }

    /**
     * Sends request to move to next level. If response is successful, the next level in order is set as active
     */
    next(): Observable<any> {
        return this.isLast()
            ? this.callApiToFinish()
            : this.callApiToNextLevel();
    }

    moveToLevel(levelId: number): Observable<Level> {
        return this.api.moveToLevel(this.trainingRunId, levelId).pipe(
            tap(
                (level) => this.setBacktrackedLevel(level),
                (err) =>
                    this.errorHandler.emitAPIError(err, 'Moving to next level')
            )
        );
    }

    isLast(): boolean {
        return (
            this.getActiveLevel()?.id ===
            this.activeLevels[this.activeLevels.length - 1]?.id
        );
    }

    /**
     * Clears current TR related attributes
     */
    clear(): void {
        this.trainingRunId = undefined;
        this.sandboxInstanceId = undefined;
        this.sandboxDefinitionId = undefined;
        this.localEnvironment = undefined;
        this.startTime = undefined;
        this.activeLevelSubject$.next(undefined);
        this.activeLevels = [];
    }

    /**
     * Sends request to preload VM consoles on backend for user for further use in topology.
     * @param sandboxId id of sandbox in which the vm exists
     */
    loadConsoles(sandboxId: string): Observable<any[]> {
        return EMPTY;
    }

    getBackwardMode(): boolean {
        return this.backwardMode;
    }

    private setActiveLevel(level: Level) {
        this.activeLevelSubject$.next(level);
    }

    private setBacktrackedLevel(level: Level) {
        this.backtrackedLevelSubject$.next(level);
    }

    private callApiToNextLevel(): Observable<Level> {
        return this.api.nextLevel(this.trainingRunId).pipe(
            tap(
                (level) => {
                    this.isCurrentLevelAnsweredSubject$.next(false);
                    this.setActiveLevel(level);
                },
                (err) =>
                    this.errorHandler.emitAPIError(err, 'Moving to next level')
            )
        );
    }

    private callApiToFinish(): Observable<any> {
        const dialog = this.displayLoadingDialog();
        return this.api.finish(this.trainingRunId).pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(err, 'Finishing training'),
            }),
            switchMap(() => {
                const tmpTrainingRunId = this.trainingRunId;
                setTimeout(() => {
                    dialog.close();
                    this.router.navigate([
                        Routing.RouteBuilder.run.linear
                            .runId(tmpTrainingRunId)
                            .results.build(),
                    ]);
                }, 5000);
                return EMPTY;
            }),
            tap(() => this.clear())
        );
    }

    private displayLoadingDialog(): MatDialogRef<LoadingDialogComponent> {
        return this.dialog.open(LoadingDialogComponent, {
            data: new LoadingDialogOptions(
                'Processing training data for visualization',
                `Please wait while your training data are being processed`
            ),
        });
    }
}
