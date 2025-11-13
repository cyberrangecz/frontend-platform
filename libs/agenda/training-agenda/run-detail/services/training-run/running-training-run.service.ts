import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LinearRunApi } from '@crczp/training-api';
import { AccessTrainingRunInfo, Level, Phase } from '@crczp/training-model';
import { BehaviorSubject, combineLatest, EMPTY, Observable, Subject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ErrorHandlerService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { LoadingDialogComponent, LoadingDialogOptions } from '@crczp/components';

/**
 * Main service for running training. Holds levels and its state. Handles user general training run user actions and events.
 * Subscribe to activeLevel$ to receive latest data updates.
 */
@Injectable()
export class RunningTrainingRunService {
    private readonly runInfoSubject$ =
        new BehaviorSubject<AccessTrainingRunInfo>(undefined);
    private readonly api = inject(LinearRunApi);
    private readonly errorHandler = inject(ErrorHandlerService);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private initialized = false;

    private readonly backtrackedLevelSubject$ = new Subject<Level>();

    public get isBacktracked$(): Observable<boolean> {
        return combineLatest([this.activeLevel$, this.backtrackedLevel$]).pipe(
            map(
                ([activeLevel, backtrackedLevel]) =>
                    backtrackedLevel !== undefined &&
                    activeLevel.id !== backtrackedLevel.id,
            ),
        );
    }

    public get backtrackedLevel$(): Observable<Level> {
        return this.backtrackedLevelSubject$.asObservable();
    }

    public get runInfo$(): Observable<AccessTrainingRunInfo> {
        return this.runInfoSubject$.asObservable();
    }

    get isInitialized(): boolean {
        return this.initialized;
    }

    get activeLevelPosition$(): Observable<number> {
        return this.runInfo$.pipe(
            map((info) =>
                info.levels.findIndex((lvl) => lvl.id === info.currentLevel.id),
            ),
        );
    }

    get activeLevel$(): Observable<Level | Phase> {
        return this.runInfo$.pipe(map((info) => info.currentLevel));
    }

    get isLastLevel$(): Observable<boolean> {
        return this.runInfo$.pipe(
            map(
                (info) =>
                    info.currentLevel.id ===
                    info.levels[info.levels.length - 1]?.id,
            ),
        );
    }

    /**
     * Initializes the service from training run access info
     * @param trainingRunInfo
     */
    updateRunInfo(trainingRunInfo: AccessTrainingRunInfo): void {
        this.initialized = true;
        this.runInfoSubject$.next(trainingRunInfo);
    }

    /**
     * Sends request to move to next level. If response is successful, the next level in order is set as active
     */
    next(): Observable<any> {
        return this.isLastLevel$.pipe(
            switchMap((isLast) =>
                isLast ? this.callApiToFinish() : this.callApiToNextLevel(),
            ),
        );
    }

    moveToLevel(levelId: number): Observable<Level> {
        return this.runInfo$.pipe(
            switchMap((runInfo) => {
                if (runInfo.currentLevel.id === levelId) {
                    return EMPTY;
                }
                return this.api
                    .moveToLevel(runInfo.trainingRunId, levelId)
                    .pipe(
                        tap(
                            (level) => this.setBacktrackedLevel(level),
                            (err) =>
                                this.errorHandler.emitAPIError(
                                    err,
                                    'Moving to level',
                                ),
                        ),
                    );
            }),
        );
    }

    isLast$(): Observable<boolean> {
        return this.runInfo$.pipe(
            map(
                (info) =>
                    info.currentLevel.id ===
                    info.levels[info.levels.length - 1]?.id,
            ),
        );
    }

    private setBacktrackedLevel(level: Level) {
        this.checkInitialized();
        this.backtrackedLevelSubject$.next(level);
    }

    private callApiToNextLevel(): Observable<Level> {
        this.checkInitialized();
        return this.runInfo$.pipe(
            switchMap((runInfo) =>
                this.api.nextLevel(runInfo.trainingRunId).pipe(
                    tap(
                        (level) => {
                            this.runInfoSubject$.next({
                                ...runInfo,
                                currentLevel: level,
                            });
                        },
                        (err) =>
                            this.errorHandler.emitAPIError(
                                err,
                                'Moving to next level',
                            ),
                    ),
                ),
            ),
        );
    }

    private callApiToFinish(): Observable<any> {
        this.checkInitialized();
        const dialog = this.displayLoadingDialog();
        return this.runInfo$.pipe(
            switchMap((runInfo) =>
                this.api.finish(runInfo.trainingRunId).pipe(
                    tap({
                        error: (err) => {
                            this.dialog.closeAll();
                            this.errorHandler.emitAPIError(
                                err,
                                'Finishing training',
                            );
                        },
                    }),
                    switchMap(() => {
                        const tmpTrainingRunId = runInfo.trainingRunId;
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
                    tap(() => this.clear()),
                ),
            ),
        );
    }

    private displayLoadingDialog(): MatDialogRef<LoadingDialogComponent> {
        return this.dialog.open(LoadingDialogComponent, {
            data: new LoadingDialogOptions(
                'Processing training data for visualization',
                `Please wait while your training data are being processed`,
            ),
        });
    }

    private checkInitialized(): void {
        if (!this.initialized) {
            this.errorHandler.emitFrontendErrorNotification(
                'Attempted to use RunningTrainingRunService before initialization',
            );
        }
    }

    private clear() {
        this.runInfoSubject$.next(undefined);
        this.backtrackedLevelSubject$.next(undefined);
        this.initialized = false;
    }
}
