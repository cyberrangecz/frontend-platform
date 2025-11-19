import { inject, Injectable } from '@angular/core';
import { LinearRunApi } from '@crczp/training-api';
import { AbstractAccessLevelService } from './abstract-access-level.service';
import { SandboxInstanceApi } from '@crczp/sandbox-api';
import { AnswerCheckResult } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '@crczp/utils';
import { AbstractTrainingRunService } from '../../abstract-training-run.service';

@Injectable()
export class LinearAccessLevelService extends AbstractAccessLevelService {
    private api = inject(LinearRunApi);
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
            .isCorrectPasskey(
                super.runService.runInfo.displayedLevel.id,
                answer,
            )
            .pipe(
                take(1),
                map((result) => {
                    return new AnswerCheckResult(result);
                }),
            );
    }
}
