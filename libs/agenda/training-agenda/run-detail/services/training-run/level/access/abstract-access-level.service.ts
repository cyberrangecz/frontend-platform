import { MatDialog } from '@angular/material/dialog';
import { AnswerCheckResult } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';
import { SentinelNotificationTypeEnum } from '@sentinel/layout/notification';
import { NotificationService } from '@crczp/utils';

export type TrainingLevelData = {
    levelId: number;
    sandboxInstanceId: string | null;
    isAnswered: boolean;
};

export abstract class AbstractAccessLevelService {
    protected constructor(
        protected dialog: MatDialog,
        protected notificationService: NotificationService,
        protected runService: AbstractTrainingRunService,
    ) {}

    abstract getAccessFile(): Observable<boolean>;

    submitAnswer(answer: string): void {
        if (!answer || answer.trim() === '') {
            this.displayEmptyAnswerDialog();
        }
        this.callApiToSubmitAnswer(answer).subscribe((answerCheck) => {
            if (answerCheck.isCorrect) {
                this.onCorrectAnswerSubmitted();
            } else {
                this.onWrongAnswerSubmitted(answerCheck);
            }
        });
    }

    protected abstract callApiToSubmitAnswer(
        answer: string,
    ): Observable<AnswerCheckResult>;

    protected onCorrectAnswerSubmitted(): void {
        this.runService.updateRunInfo({
            isLevelAnswered: true,
        });
        this.runService.nextLevel();
    }

    protected onWrongAnswerSubmitted(answerCheck: AnswerCheckResult): void {
        this.displayWrongAnswerDialog(answerCheck);
    }

    protected displayEmptyAnswerDialog(): void {
        this.notificationService
            .emit(SentinelNotificationTypeEnum.Warning, 'Incorrect passkey', [
                'Answer cannot be empty.',
            ])
            .subscribe();
    }

    protected displayWrongAnswerDialog(answerCheck: AnswerCheckResult): void {
        this.notificationService
            .emit(SentinelNotificationTypeEnum.Warning, 'Incorrect passkey', [
                'You have submitted an incorrect answer.',
                this.runService.runInfo.isLevelAnswered ||
                answerCheck.remainingAttempts <= 0
                    ? 'Please insert the answer according to revealed solution.'
                    : `You have ${answerCheck.remainingAttempts} remaining attempts.`,
            ])
            .subscribe();
    }
}
