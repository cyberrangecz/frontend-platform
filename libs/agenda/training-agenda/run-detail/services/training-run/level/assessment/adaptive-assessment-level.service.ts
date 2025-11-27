import { inject, Injectable } from '@angular/core';
import { AdaptiveRunApi } from '@crczp/training-api';
import { QuestionAnswer } from '@crczp/training-model';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';

/**
 * Handles events and actions specific for assessment level in training run
 */
@Injectable()
export class AdaptiveAssessmentLevelService {
    private api = inject(AdaptiveRunApi);
    private runningTrainingRunService = inject(AbstractTrainingRunService);

    submit(answers: QuestionAnswer[]): void {
        this.api
            .evaluateQuestionnaire(
                this.runningTrainingRunService.runInfo.trainingRunId,
                answers,
            )
            .subscribe(() => {
                this.runningTrainingRunService.updateRunInfo({
                    isCurrentLevelAnswered: true,
                });
                this.runningTrainingRunService.nextLevel();
            });
    }
}
