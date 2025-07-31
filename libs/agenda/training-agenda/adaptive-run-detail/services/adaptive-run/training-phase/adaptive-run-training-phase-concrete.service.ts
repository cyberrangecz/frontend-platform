import { inject, Injectable } from '@angular/core';
import { AdaptiveRunTrainingPhaseService } from './adaptive-run-training-phase.service';
import { AdaptiveRunApi } from '@crczp/training-api';
import { SandboxInstanceApi } from '@crczp/sandbox-api';
import { MatDialog } from '@angular/material/dialog';
import { RunningAdaptiveRunService } from '../running/running-adaptive-run.service';
import { EMPTY, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { SentinelDialogResultEnum } from '@sentinel/components/dialogs';
import { SentinelNotificationService } from '@sentinel/layout/notification';
import { ErrorHandlerService } from '@crczp/utils';

@Injectable()
export class AdaptiveRunTrainingPhaseConcreteService extends AdaptiveRunTrainingPhaseService {
    private api = inject(AdaptiveRunApi);
    private sandboxApi = inject(SandboxInstanceApi);
    private errorHandler = inject(ErrorHandlerService);

    constructor() {
        const notificationService = inject(SentinelNotificationService);
        const dialog = inject(MatDialog);
        const runningAdaptiveRunService = inject(RunningAdaptiveRunService);

        super(dialog, notificationService, runningAdaptiveRunService);
    }

    getAccessFile(): Observable<any> {
        return this.sandboxApi
            .getUserSshAccess(this.runningAdaptiveRunService.sandboxInstanceId)
            .pipe(
                tap(
                    (_) => _,
                    (err) => {
                        this.errorHandler.emitAPIError(
                            err,
                            'Access files for trainee'
                        );
                    }
                )
            );
    }

    submitAnswer(answer: string): Observable<any> {
        if (!answer) {
            return this.displayEmptyAnswerDialog();
        }
        this.isLoadingSubject$.next(true);
        return this.api
            .isCorrectAnswer(
                this.runningAdaptiveRunService.trainingRunId,
                answer
            )
            .pipe(
                switchMap((answerCheckResult) =>
                    answerCheckResult.isCorrect
                        ? this.onCorrectAnswerSubmitted()
                        : this.onWrongAnswerSubmitted(answerCheckResult)
                ),
                tap(
                    () => this.isLoadingSubject$.next(false),
                    (err) => {
                        this.isLoadingSubject$.next(false);
                        this.errorHandler.emitAPIError(
                            err,
                            'Submitting answer'
                        );
                    }
                )
            );
    }

    revealSolution(): Observable<string> {
        return this.displayRevealSolutionDialog().pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToRevealSolution(
                          this.runningAdaptiveRunService.trainingRunId
                      )
                    : EMPTY
            )
        );
    }

    private callApiToRevealSolution(trainingRunId: number): Observable<string> {
        this.isLoadingSubject$.next(true);
        return this.api.takeSolution(trainingRunId).pipe(
            tap(
                (solution) => {
                    this.isLoadingSubject$.next(false);
                    this.onSolutionRevealed(solution);
                },
                (err) => {
                    this.isLoadingSubject$.next(false);
                    this.errorHandler.emitAPIError(err, 'Revealing solution');
                }
            )
        );
    }
}
