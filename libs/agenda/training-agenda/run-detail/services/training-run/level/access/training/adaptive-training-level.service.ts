import { inject, Injectable } from '@angular/core';
import { AdaptiveRunApi } from '@crczp/training-api';
import { SandboxInstanceApi } from '@crczp/sandbox-api';
import { AnswerCheckResult } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';
import { AbstractTrainingRunService } from '../../../abstract-training-run.service';
import { AbstractTrainingLevelService } from './abstract-training-level.service';

@Injectable()
/**
 * Handles events and actions specific for training level in training run
 */
export class AdaptiveTrainingLevelService extends AbstractTrainingLevelService {
    private api = inject(AdaptiveRunApi);
    private sandboxApi = inject(SandboxInstanceApi);

    constructor() {
        super(
            inject(MatDialog),
            inject(NotificationService),
            inject(AbstractTrainingRunService),
            inject(ErrorHandlerService),
        );
    }

    getAccessFile(): Observable<boolean> {
        return this.sandboxApi
            .getUserSshAccess(this.runService.runInfo.sandboxInstanceId)
            .pipe(take(1));
    }

    callApiToSubmitAnswer(answer: string): Observable<AnswerCheckResult> {
        return this.api
            .isCorrectAnswer(this.runService.runInfo.displayedLevel.id, answer)
            .pipe(take(1));
    }

    protected callApiToRevealSolution(): Observable<string> {
        return this.api
            .takeSolution(this.runService.runInfo.displayedLevel.id)
            .pipe(take(1));
    }
}
