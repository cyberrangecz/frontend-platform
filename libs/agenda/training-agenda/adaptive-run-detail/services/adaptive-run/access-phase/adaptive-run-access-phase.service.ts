import { BehaviorSubject, Observable } from 'rxjs';
import { RunningAdaptiveRunService } from '../running/running-adaptive-run.service';
import {
    SentinelNotification,
    SentinelNotificationResult,
    SentinelNotificationService,
    SentinelNotificationTypeEnum,
} from '@sentinel/layout/notification';
import { map } from 'rxjs/operators';

export abstract class AdaptiveRunAccessPhaseService {
    protected constructor(
        protected notificationService: SentinelNotificationService,
        protected runningAdaptiveRunService: RunningAdaptiveRunService,
    ) {}

    protected isCorrectPasskeySubmittedSubject$: BehaviorSubject<boolean>;
    isCorrectPasskeySubmitted$: Observable<boolean>;

    protected isLoadingSubject$: BehaviorSubject<boolean>;
    isLoading$: Observable<boolean>;

    abstract submitPasskey(passkey: string): Observable<any>;

    abstract getAccessFile(): Observable<boolean>;

    init(isPhaseAnswered: boolean): void {
        this.isCorrectPasskeySubmittedSubject$ = new BehaviorSubject(isPhaseAnswered);
        this.isCorrectPasskeySubmitted$ = this.isCorrectPasskeySubmittedSubject$.asObservable();
        this.isLoadingSubject$ = new BehaviorSubject(false);
        this.isLoading$ = this.isLoadingSubject$.asObservable();
    }

    protected onCorrectPasskeySubmitted(): Observable<any> {
        this.isCorrectPasskeySubmittedSubject$.next(true);
        return this.runningAdaptiveRunService.next();
    }

    protected onWrongPasskeySubmitted(additionalData: string = 'The provided passkey is not correct'): Observable<any> {
        const notification: SentinelNotification = {
            type: SentinelNotificationTypeEnum.Error,
            title: 'Incorrect passkey',
            additionalInfo: [additionalData],
        };
        return this.notificationService
            .emit(notification)
            .pipe(map((result) => result === SentinelNotificationResult.CONFIRMED));
    }
}
