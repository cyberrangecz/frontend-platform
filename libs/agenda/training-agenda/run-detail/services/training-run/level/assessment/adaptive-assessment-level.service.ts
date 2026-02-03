import { inject, Injectable } from '@angular/core';
import { AdaptiveRunApi } from '@crczp/training-api';
import { QuestionAnswer } from '@crczp/training-model';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';
import { LoadingTracker } from '@crczp/utils';

/**
 * Handles events and actions specific for assessment level in training run
 */
@Injectable()
export class AdaptiveAssessmentLevelService {
    private api = inject(AdaptiveRunApi);
    private runningTrainingRunService = inject(AbstractTrainingRunService);

    protected readonly loadingTracker = new LoadingTracker();
    public readonly isLoading$ = this.loadingTracker.isLoading$;

    submit(answers: QuestionAnswer[]): void {
        this.loadingTracker.trackRequest(()=>this.api
            .evaluateQuestionnaire(
                this.runningTrainingRunService.runInfo.trainingRunId,
                answers,
            ))
            .subscribe(() => {
                this.runningTrainingRunService.updateRunInfo({
                    isCurrentLevelAnswered: true,
                });
                this.runningTrainingRunService.nextLevel();
            });
    }
}
