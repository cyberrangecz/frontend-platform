import { MatDialog } from '@angular/material/dialog';
import { RunningAdaptiveRunService } from '../running/running-adaptive-run.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { LevelAnswerCheck, PhaseAnswerCheck, TrainingPhase } from '@crczp/training-model';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {
    SentinelNotification,
    SentinelNotificationResult,
    SentinelNotificationService,
    SentinelNotificationTypeEnum,
} from '@sentinel/layout/notification';
import { map } from 'rxjs/operators';

export abstract class AdaptiveRunTrainingPhaseService {
    protected constructor(
        protected dialog: MatDialog,
        protected notificationService: SentinelNotificationService,
        protected runningAdaptiveRunService: RunningAdaptiveRunService,
    ) {}

    protected isSolutionRevealedSubject$: BehaviorSubject<boolean>;
    isSolutionRevealed$: Observable<boolean>;

    protected displayedSolutionContentSubject$: BehaviorSubject<string>;
    displayedSolutionContent$: Observable<string>;

    protected isCorrectAnswerSubmittedSubject$: BehaviorSubject<boolean>;
    isCorrectAnswerSubmitted$: Observable<boolean>;

    protected isLoadingSubject$: BehaviorSubject<boolean>;
    isLoading$: Observable<boolean>;

    abstract submitAnswer(Answer: string): Observable<any>;

    abstract revealSolution(): Observable<string>;

    abstract getAccessFile(): Observable<boolean>;

    init(phase: TrainingPhase, isPhaseAnswered: boolean): void {
        this.initObservables(isPhaseAnswered);
        this.initSolutionState(phase);
    }

    protected initObservables(isPhaseAnswered: boolean): void {
        this.displayedSolutionContentSubject$ = new BehaviorSubject(undefined);
        this.displayedSolutionContent$ = this.displayedSolutionContentSubject$.asObservable();
        this.isSolutionRevealedSubject$ = new BehaviorSubject(false);
        this.isSolutionRevealed$ = this.isSolutionRevealedSubject$.asObservable();
        this.isCorrectAnswerSubmittedSubject$ = new BehaviorSubject(isPhaseAnswered);
        this.isCorrectAnswerSubmitted$ = this.isCorrectAnswerSubmittedSubject$.asObservable();
        this.isLoadingSubject$ = new BehaviorSubject(false);
        this.isLoading$ = this.isLoadingSubject$.asObservable();
    }

    protected initSolutionState(phase: TrainingPhase): void {
        if (phase.currentTask.solution !== null && phase.currentTask.solution !== undefined) {
            this.onSolutionRevealed(phase.currentTask.solution);
        }
    }

    protected onSolutionRevealed(solution: string): void {
        this.displayedSolutionContentSubject$.next(solution);
        this.isSolutionRevealedSubject$.next(true);
    }

    protected shouldSolutionBeRevealed(answerCheck: PhaseAnswerCheck): boolean {
        return !this.isSolutionRevealedSubject$.getValue() && !answerCheck.hasRemainingAttempts();
    }

    protected onCorrectAnswerSubmitted(): Observable<any> {
        this.isCorrectAnswerSubmittedSubject$.next(true);
        return this.runningAdaptiveRunService.next();
    }

    protected onWrongAnswerSubmitted(answerCheck: PhaseAnswerCheck): Observable<any> {
        if (this.shouldSolutionBeRevealed(answerCheck)) {
            this.onSolutionRevealed(answerCheck.solution);
        }
        return this.displayWrongAnswerDialog(answerCheck);
    }

    protected displayEmptyAnswerDialog(): Observable<any> {
        const notification: SentinelNotification = {
            type: SentinelNotificationTypeEnum.Error,
            title: 'Incorrect passkey',
            additionalInfo: ['Answer cannot be empty.'],
        };
        return this.notificationService
            .emit(notification)
            .pipe(map((result) => result === SentinelNotificationResult.CONFIRMED));
    }

    protected displayWrongAnswerDialog(answerCheck: LevelAnswerCheck): Observable<any> {
        const notification: SentinelNotification = {
            type: SentinelNotificationTypeEnum.Error,
            title: 'Incorrect passkey',
            additionalInfo: [
                'You have submitted an incorrect answer.',
                this.isSolutionRevealedSubject$.getValue() || answerCheck.remainingAttempts <= 0
                    ? 'Please insert the answer according to revealed solution.'
                    : `You have ${answerCheck.remainingAttempts} remaining attempts.`,
            ],
        };
        return this.notificationService
            .emit(notification)
            .pipe(map((result) => result === SentinelNotificationResult.CONFIRMED));
    }

    protected displayRevealSolutionDialog(): Observable<SentinelDialogResultEnum> {
        const dialogMessage = 'Do you want to reveal solution of this phase?';
        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig('Reveal Solution', dialogMessage, 'Cancel', 'Reveal'),
        });
        return dialogRef.afterClosed();
    }
}
