import { Observable } from 'rxjs';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { AbstractAccessLevelService } from '../abstract-access-level.service';
import { take } from 'rxjs/operators';
import {
    AnswerCheckResult,
    TrainingLevel,
    TrainingPhase,
} from '@crczp/training-model';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';
import { AbstractTrainingRunService } from '../../../abstract-training-run.service';

export abstract class AbstractTrainingLevelService extends AbstractAccessLevelService {
    protected constructor(
        protected dialog: MatDialog,
        protected notificationService: NotificationService,
        protected runService: AbstractTrainingRunService,
        protected errorHandler: ErrorHandlerService,
    ) {
        super(dialog, notificationService, runService);
    }

    protected get displayedTrainingLevel() {
        return this.runService.runInfo.currentLevel as
            | TrainingLevel
            | TrainingPhase;
    }

    showRevealSolutionDialogAndFetch(): void {
        this.displayRevealSolutionDialog(
            this.displayedTrainingLevel.solutionPenalized(),
        )
            .pipe(take(1))
            .subscribe((result) => {
                if (result === SentinelDialogResultEnum.CONFIRMED) {
                    this.revealSolution();
                }
            });
    }

    protected abstract callApiToRevealSolution(): Observable<string>;

    protected onWrongAnswerSubmitted(answerCheck: AnswerCheckResult) {
        if (this.shouldSolutionBeRevealed(answerCheck)) {
            this.revealSolution();
        }
        this.displayWrongAnswerNotification(answerCheck);
    }

    protected shouldSolutionBeRevealed(
        answerCheck: AnswerCheckResult,
    ): boolean {
        return (
            !this.displayedTrainingLevel.solutionRevealed() &&
            !answerCheck.hasRemainingAttempts()
        );
    }

    protected displayRevealSolutionDialog(
        solutionPenalized: boolean,
    ): Observable<SentinelDialogResultEnum> {
        let dialogMessage = 'Do you want to reveal solution of this level?';
        dialogMessage += solutionPenalized
            ? '\n All your points will be subtracted.'
            : '';

        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Reveal Solution',
                    dialogMessage,
                    'Cancel',
                    'Reveal',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    protected displayWrongAnswerNotification(
        answerCheck: AnswerCheckResult,
    ): void {
        const dialogData = new SentinelConfirmationDialogConfig(
            'Incorrect Answer',
            `You have submitted an incorrect answer.${
                answerCheck.remainingAttempts <= 0
                    ? ' Please insert the answer according to revealed solution.'
                    : ` You have ${answerCheck.remainingAttempts} remaining attempts.`
            }`,
            'Close',
            '',
        );

        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            { data: dialogData },
        );
        dialogRef.afterClosed().subscribe();
    }

    private revealSolution(): void {
        this.callApiToRevealSolution().subscribe((solution) => {
            const trainingLevel = this.displayedTrainingLevel;
            this.runService.updateRunInfo({
                levels: this.runService.runInfo.levels.map((level) => {
                    if (level.id === trainingLevel.id) {
                        if (level instanceof TrainingLevel) {
                            level.solution = solution;
                        }
                        if (level instanceof TrainingPhase) {
                            level.currentTask.solution = solution;
                        }
                    }
                    return level;
                }),
            });
        });
    }
}
