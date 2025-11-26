import { inject, Injectable } from '@angular/core';
import { LinearRunApi } from '@crczp/training-api';
import { Question } from '@crczp/training-model';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';

/**
 * Handles events and actions specific for assessment level in training run
 */
@Injectable()
export class LinearAssessmentLevelService {
    private api = inject(LinearRunApi);
    private runningTrainingRunService = inject(AbstractTrainingRunService);

    /**
     * Submit answers entered by trainee
     * @param answers answers entered by user
     */
    submit(answers: Question[]): void {
        this.api
            .submitAnswers(
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
