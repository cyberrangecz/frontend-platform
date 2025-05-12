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
    protected constructor(
        protected notificationService: SentinelNotificationService,
        protected runningTrainingRunService: RunningTrainingRunService,
    ) {}

    protected isCorrectPasskeySubmittedSubject$: BehaviorSubject<boolean>;
    isCorrectPasskeySubmitted$: Observable<boolean>;

    protected isLoadingSubject$: BehaviorSubject<boolean>;
    isLoading$: Observable<boolean>;

    abstract submitPasskey(passkey: string): Observable<any>;

    abstract getAccessFile(): Observable<boolean>;

    init(isLevelAnswered: boolean): void {
        this.isCorrectPasskeySubmittedSubject$ = new BehaviorSubject(isLevelAnswered);
        this.isCorrectPasskeySubmitted$ = this.isCorrectPasskeySubmittedSubject$.asObservable();
        this.isLoadingSubject$ = new BehaviorSubject(false);
        this.isLoading$ = this.isLoadingSubject$.asObservable();
    }

    protected onCorrectPasskeySubmitted(): Observable<any> {
        this.isCorrectPasskeySubmittedSubject$.next(true);
        return this.runningTrainingRunService.next();
    }

    protected onWrongPasskeySubmitted(text: string = 'The provided passkey is not correct.'): Observable<any> {
        const notification: SentinelNotification = {
            type: SentinelNotificationTypeEnum.Error,
            title: 'Incorrect passkey',
            additionalInfo: [text],
        };
        return this.notificationService
            .emit(notification)
            .pipe(map((result) => result === SentinelNotificationResult.CONFIRMED));
    }
}
