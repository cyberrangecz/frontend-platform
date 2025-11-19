import { inject, Injectable } from '@angular/core';
import { LinearRunApi } from '@crczp/training-api';
import { SandboxInstanceApi } from '@crczp/sandbox-api';
import { AnswerCheckResult, Hint, TrainingLevel } from '@crczp/training-model';
import { Observable, of, switchMap } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { MatDialog } from '@angular/material/dialog';
import { AbstractTrainingRunService } from '../../../abstract-training-run.service';
import {
    AbstractTrainingLevelService,
    TrainingLevelDataWithSolution,
} from './abstract-training-level.service';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';

export type LinearTrainingLevelData = TrainingLevelDataWithSolution & {
    hints: Hint[];
};

@Injectable()
export class LinearTrainingLevelService extends AbstractTrainingLevelService {
    private api = inject(LinearRunApi);
    private sandboxApi = inject(SandboxInstanceApi);

    constructor() {
        super(
            inject(MatDialog),
            inject(NotificationService),
            inject(AbstractTrainingRunService),
            inject(ErrorHandlerService),
        );
    }

    private static mapToDataObject(
        level: TrainingLevel,
        isAnswered: boolean,
        sandboxId: string,
    ): LinearTrainingLevelData {
        return {
            levelId: level.id,
            revealedSolution: level.solution,
            hints: level.hints,
            solutionPenalized: level.isSolutionPenalized,
            isAnswered: isAnswered,
            sandboxInstanceId: sandboxId,
        };
    }

    callApiToTakeHint(hint: Hint): Observable<Hint> {
        return this.api
            .takeHint(super.runService.runInfo.displayedLevel.id, hint.id)
            .pipe(take(1));
    }

    callApiToRevealSolution(): Observable<string> {
        return this.api
            .takeSolution(super.runService.runInfo.displayedLevel.id)
            .pipe(take(1));
    }

    getAccessFile(): Observable<boolean> {
        return this.sandboxApi
            .getUserSshAccess(super.runService.runInfo.sandboxInstanceId)
            .pipe(take(1));
    }

    callApiToSubmitAnswer(answer: string): Observable<AnswerCheckResult> {
        return this.api
            .isCorrectAnswer(super.runService.runInfo.displayedLevel.id, answer)
            .pipe(take(1));
    }

    revealHint(hint: Hint): Observable<boolean> {
        if (hint.isRevealed()) {
            return of(false);
        }
        return this.displayTakeHintDialog(hint).pipe(
            take(1),
            switchMap((result) => {
                if (result === SentinelDialogResultEnum.CONFIRMED) {
                    return this.callApiToTakeHint(hint).pipe(
                        tap((revealedHint) => {
                            const changedLevel = this
                                .displayedTrainingLevel as TrainingLevel;
                            changedLevel.hints = changedLevel.hints.map((h) =>
                                h.id === revealedHint.id ? revealedHint : h,
                            );
                            super.runService.updateLevel(changedLevel);
                        }),
                        map(() => true),
                    );
                }
                return of(false);
            }),
        );
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
