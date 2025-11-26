import { inject, Injectable } from '@angular/core';
import { LinearRunApi } from '@crczp/training-api';
import { AnswerCheckResult, Hint, TrainingLevel } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { MatDialog } from '@angular/material/dialog';
import { AbstractTrainingRunService } from '../../../abstract-training-run.service';
import { AbstractTrainingLevelService } from './abstract-training-level.service';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';

@Injectable()
export class LinearTrainingLevelService extends AbstractTrainingLevelService {
    private api = inject(LinearRunApi);

    constructor() {
        super(
            inject(MatDialog),
            inject(NotificationService),
            inject(AbstractTrainingRunService),
            inject(ErrorHandlerService),
        );
    }

    callApiToTakeHint(hint: Hint): Observable<Hint> {
        return this.api
            .takeHint(this.runService.runInfo.trainingRunId, hint.id)
            .pipe(take(1));
    }

    callApiToRevealSolution(): Observable<string> {
        return this.api
            .takeSolution(this.runService.runInfo.trainingRunId)
            .pipe(take(1));
    }

    callApiToSubmitAnswer(answer: string): Observable<AnswerCheckResult> {
        return this.api
            .isCorrectAnswer(this.runService.runInfo.trainingRunId, answer)
            .pipe(take(1));
    }

    revealHint(hint: Hint) {
        this.displayTakeHintDialog(hint).subscribe((result) => {
            if (result === SentinelDialogResultEnum.CONFIRMED) {
                this.callApiToTakeHint(hint).subscribe((revealedHint) => {
                    console.log('Received revealed hint: ', revealedHint);
                    const trainingLevel = this.runService.runInfo
                        .displayedLevel as TrainingLevel;
                    console.log('Displayed training level: ', trainingLevel);
                    trainingLevel.hints = trainingLevel.hints.map((h) =>
                        h.id === revealedHint.id ? revealedHint : h,
                    );
                    console.log('Updated training level: ', trainingLevel);
                    this.runService.updateRunInfo({
                        levels: this.runService.runInfo.levels.map((level) => {
                            if (level.id === trainingLevel.id) {
                                (level as TrainingLevel).hints =
                                    trainingLevel.hints;
                            }
                            return level;
                        }),
                    });
                });
            }
        });
    }

    protected displayTakeHintDialog(
        hint: Hint,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Reveal Hint',
                    `Do you want to reveal hint "${hint.title}"?
 It will cost you ${hint.penalty} points.`,
                    'Cancel',
                    'Reveal',
                ),
            },
        );
        return dialogRef.afterClosed();
    }
}
