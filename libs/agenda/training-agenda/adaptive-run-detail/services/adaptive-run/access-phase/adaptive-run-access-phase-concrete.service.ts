import { Injectable } from '@angular/core';
import { AdaptiveRunAccessPhaseService } from './adaptive-run-access-phase.service';
import { AdaptiveRunApi } from '@crczp/training-api';
import { SandboxInstanceApi } from '@crczp/sandbox-api';
import { TrainingErrorHandler } from '@crczp/training-agenda';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { RunningAdaptiveRunService } from '../running/running-adaptive-run.service';
import { SentinelNotificationService } from '@sentinel/layout/notification';

@Injectable()
export class AdaptiveRunAccessPhaseConcreteService extends AdaptiveRunAccessPhaseService {
    constructor(
        private api: AdaptiveRunApi,
        private sandboxApi: SandboxInstanceApi,
        private errorHandler: TrainingErrorHandler,
        protected notificationService: SentinelNotificationService,
        protected runningAdaptiveRunService: RunningAdaptiveRunService,
    ) {
        super(notificationService, runningAdaptiveRunService);
    }

    getAccessFile(): Observable<any> {
        return this.sandboxApi.getUserSshAccess(this.runningAdaptiveRunService.sandboxInstanceId).pipe(
            tap(
                (_) => _,
                (err) => {
                    this.errorHandler.emit(err, 'Access files for trainee');
                },
            ),
        );
    }

    submitPasskey(passkey: string): Observable<any> {
        if (!passkey) {
            return this.onWrongPasskeySubmitted('Passkey cannot be empty');
        }
        this.isLoadingSubject$.next(true);
        return this.api.isCorrectPasskey(this.runningAdaptiveRunService.trainingRunId, passkey).pipe(
            switchMap((isCorrect) => (isCorrect ? this.onCorrectPasskeySubmitted() : this.onWrongPasskeySubmitted())),
            tap(
                () => this.isLoadingSubject$.next(false),
                (err) => {
                    this.isLoadingSubject$.next(false);
                    this.errorHandler.emit(err, 'Submitting passkey');
                },
            ),
        );
    }
}
