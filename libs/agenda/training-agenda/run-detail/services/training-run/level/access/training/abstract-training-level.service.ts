import { Observable } from 'rxjs';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {
    AbstractAccessLevelService,
    TrainingLevelData,
} from '../abstract-access-level.service';
import { map, take } from 'rxjs/operators';
import {
    AnswerCheckResult,
    TrainingLevel,
    TrainingPhase,
} from '@crczp/training-model';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';
import { AbstractTrainingRunService } from '../../../abstract-training-run.service';

export type TrainingLevelDataWithSolution = TrainingLevelData & {
    revealedSolution: string;
    solutionPenalized: boolean;
};

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
        return super.runService.runInfo.currentLevel as
            | TrainingLevel
            | TrainingPhase;
    }

    protected get displayedTrainingLevel$(): Observable<
        TrainingLevel | TrainingPhase
    > {
        return this.runService.runInfo$.pipe(
            map(
                (runInfo) =>
                    runInfo.currentLevel as TrainingLevel | TrainingPhase,
            ),
        );
    }

    revealSolution(): void {
        this.displayRevealSolutionDialog(
            this.displayedTrainingLevel.solutionPenalized(),
        )
            .pipe(take(1))
            .subscribe((result) => {
                if (result === SentinelDialogResultEnum.CONFIRMED) {
                    this.callApiToRevealSolution().subscribe((solution) => {
                        const trainingLevel = this.displayedTrainingLevel;
                        trainingLevel.setSolutionContent(solution);
                        this.runService.updateLevel(trainingLevel);
                    });
                }
            });
    }

    protected abstract callApiToRevealSolution(): Observable<string>;

    protected onWrongAnswerSubmitted(answerCheck: AnswerCheckResult) {
        if (this.shouldSolutionBeRevealed(answerCheck)) {
            this.revealSolution();
        }
        super.onWrongAnswerSubmitted(answerCheck);
    }

    protected shouldSolutionBeRevealed(
        answerCheck: AnswerCheckResult,
    ): boolean {
        return (
            !this.displayedTrainingLevel.solutionRevealed &&
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
}
