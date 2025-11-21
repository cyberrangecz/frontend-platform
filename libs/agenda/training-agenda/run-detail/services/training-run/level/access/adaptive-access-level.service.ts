import { inject, Injectable } from '@angular/core';
import { AdaptiveRunApi } from '@crczp/training-api';
import { AbstractAccessLevelService } from './abstract-access-level.service';
import { AnswerCheckResult } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@crczp/utils';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';

@Injectable()
export class AdaptiveAccessLevelService extends AbstractAccessLevelService {
    private api = inject(AdaptiveRunApi);

    constructor() {
        super(
            inject(MatDialog),
            inject(NotificationService),
            inject(AbstractTrainingRunService),
        );
    }

    callApiToSubmitAnswer(answer: string): Observable<AnswerCheckResult> {
        return this.api
            .isCorrectAnswer(this.runService.runInfo.trainingRunId, answer)
            .pipe(take(1));
    }
}
