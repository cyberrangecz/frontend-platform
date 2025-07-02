import { Injectable, inject } from '@angular/core';
import {TrainingRunApi} from '@crczp/training-api';
import {Observable} from 'rxjs';
import {switchMap, tap} from 'rxjs/operators';
import {TrainingErrorHandler} from '@crczp/training-agenda';
import {RunningTrainingRunService} from '../../running/running-training-run.service';
import {SandboxInstanceApi} from '@crczp/sandbox-api';
import {TrainingRunAccessLevelService} from './training-run-access-level.service';
import {SentinelNotificationService} from '@sentinel/layout/notification';

@Injectable()
/**
 * Handles events and actions specific for training level in training run
 */
export class TrainingRunAccessLevelConcreteService extends TrainingRunAccessLevelService {
    private api = inject(TrainingRunApi);
    private sandboxApi = inject(SandboxInstanceApi);
    private errorHandler = inject(TrainingErrorHandler);
    protected notificationService: SentinelNotificationService;
    protected runningTrainingRunService: RunningTrainingRunService;

    constructor() {
        const notificationService = inject(SentinelNotificationService);
        const runningTrainingRunService = inject(RunningTrainingRunService);

        super(notificationService, runningTrainingRunService);
    
        this.notificationService = notificationService;
        this.runningTrainingRunService = runningTrainingRunService;
    }

    /**
     * Retrieves file for ssh access for trainee
     */
    getAccessFile(): Observable<any> {
        return this.sandboxApi.getUserSshAccess(this.runningTrainingRunService.sandboxInstanceId).pipe(
            tap(
                (_) => _,
                (err) => {
                    this.errorHandler.emit(err, 'Access files for trainee');
                },
            ),
        );
    }

    /**
     * Evaluates if passkey entered by trainee is correct
     * @param passkey passkey entered by trainee
     */
    submitPasskey(passkey: string): Observable<any> {
        if (!passkey) {
            return this.onWrongPasskeySubmitted('Passkey cannot be empty');
        }
        this.isLoadingSubject$.next(true);
        return this.api.isCorrectPasskey(this.runningTrainingRunService.trainingRunId, passkey).pipe(
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
