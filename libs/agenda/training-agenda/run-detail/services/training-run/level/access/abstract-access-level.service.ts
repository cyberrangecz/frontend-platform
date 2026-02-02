import { MatDialog } from '@angular/material/dialog';
import { AnswerCheckResult } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';
import { SentinelNotificationTypeEnum } from '@sentinel/layout/notification';
import { LoadingTracker, NotificationService } from '@crczp/utils';

export type TrainingLevelData = {
    levelId: number;
    sandboxInstanceId: string | null;
    isAnswered: boolean;
};

export abstract class AbstractAccessLevelService {
    private readonly triedAnswers: Set<string> = new Set<string>();

    protected readonly loadingTracker = new LoadingTracker();
    public readonly isLoading$ = this.loadingTracker.isLoading$;

    protected constructor(
        protected dialog: MatDialog,
        protected notificationService: NotificationService,
        protected runService: AbstractTrainingRunService,
    ) {}

    submitAnswer(answer: string): void {
        if (!answer || answer.trim() === '') {
            this.displayEmptyAnswerNotification();
        }
        if (this.triedAnswers.has(answer)) {
            this.notificationService
                .emit(
                    SentinelNotificationTypeEnum.Warning,
                    'You have already tried this answer.',
                )
                .subscribe();
            return;
        }
        this.triedAnswers.add(answer);
        this.loadingTracker
            .trackRequest(() => this.callApiToSubmitAnswer(answer))
            .subscribe((answerCheck) => {
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
            isCurrentLevelAnswered: true,
        });
        this.runService.nextLevel();
    }

    protected onWrongAnswerSubmitted(answerCheck: AnswerCheckResult): void {
        this.displayWrongAnswerNotification(answerCheck);
    }

    protected displayEmptyAnswerNotification(): void {
        this.notificationService
            .emit(
                SentinelNotificationTypeEnum.Warning,
                'Answer cannot be empty.',
            )
            .subscribe();
    }

    protected displayWrongAnswerNotification(
        answerCheck: AnswerCheckResult,
    ): void {
        this.notificationService
            .emit(SentinelNotificationTypeEnum.Warning, 'Incorrect passkey')
            .subscribe();
    }
}
