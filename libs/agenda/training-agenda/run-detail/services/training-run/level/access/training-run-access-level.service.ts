import { BehaviorSubject, Observable } from 'rxjs';
import { RunningTrainingRunService } from '../../running/running-training-run.service';
import {
    SentinelNotification,
    SentinelNotificationResult,
    SentinelNotificationService,
    SentinelNotificationTypeEnum,
} from '@sentinel/layout/notification';
import { map } from 'rxjs/operators';

export abstract class TrainingRunAccessLevelService {
    isCorrectPasskeySubmitted$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    protected isCorrectPasskeySubmittedSubject$: BehaviorSubject<boolean>;
    protected isLoadingSubject$: BehaviorSubject<boolean>;

    protected constructor(
        protected notificationService: SentinelNotificationService,
        protected runningTrainingRunService: RunningTrainingRunService
    ) {}

    abstract submitPasskey(passkey: string): Observable<any>;

    abstract getAccessFile(): Observable<boolean>;

    init(isLevelAnswered: boolean): void {
        this.isCorrectPasskeySubmittedSubject$ = new BehaviorSubject(
            isLevelAnswered
        );
        this.isCorrectPasskeySubmitted$ =
            this.isCorrectPasskeySubmittedSubject$.asObservable();
        this.isLoadingSubject$ = new BehaviorSubject(false);
        this.isLoading$ = this.isLoadingSubject$.asObservable();
    }

    protected onCorrectPasskeySubmitted(): Observable<any> {
        this.isCorrectPasskeySubmittedSubject$.next(true);
        return this.runningTrainingRunService.next();
    }

    protected onWrongPasskeySubmitted(
        text = 'The provided passkey is not correct.'
    ): Observable<any> {
        const notification: SentinelNotification = {
            type: SentinelNotificationTypeEnum.Error,
            title: 'Incorrect passkey',
            additionalInfo: [text],
        };
        return this.notificationService
            .emit(notification)
            .pipe(
                map((result) => result === SentinelNotificationResult.CONFIRMED)
            );
    }
}
