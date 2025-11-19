import { inject, Injectable } from '@angular/core';
import { AdaptiveRunApi } from '@crczp/training-api';
import { AbstractAccessLevelService } from './abstract-access-level.service';
import { SandboxInstanceApi } from '@crczp/sandbox-api';
import { AnswerCheckResult } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@crczp/utils';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';

@Injectable()
export class AdaptiveAccessLevelService extends AbstractAccessLevelService {
    private api = inject(AdaptiveRunApi);
    private sandboxApi = inject(SandboxInstanceApi);

    constructor() {
        super(
            inject(MatDialog),
            inject(NotificationService),
            inject(AbstractTrainingRunService),
        );
    }

    getAccessFile(): Observable<boolean> {
        return this.sandboxApi
            .getUserSshAccess(super.runService.runInfo.sandboxInstanceId)
            .pipe(take(1));
    }

    callApiToSubmitAnswer(answer: string): Observable<AnswerCheckResult> {
        return this.api
            .isCorrectAnswer(super.runService.runInfo.currentLevel.id, answer)
            .pipe(take(1));
    }
}
