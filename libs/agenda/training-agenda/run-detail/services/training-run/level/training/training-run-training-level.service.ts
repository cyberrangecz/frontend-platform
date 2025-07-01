import { MatDialog } from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { Hint, LevelAnswerCheck, PhaseAnswerCheck, TrainingLevel } from '@crczp/training-model';
import { BehaviorSubject, Observable } from 'rxjs';
import { RunningTrainingRunService } from '../../running/running-training-run.service';
import { HintButton } from '@crczp/training-agenda/internal';
import {
    SentinelNotification,
    SentinelNotificationResult,
    SentinelNotificationService,
    SentinelNotificationTypeEnum,
} from '@sentinel/layout/notification';
import { map } from 'rxjs/operators';

export abstract class TrainingRunTrainingLevelService {
    protected constructor(
        protected dialog: MatDialog,
        protected notificationService: SentinelNotificationService,
        protected runningTrainingRunService: RunningTrainingRunService,
    ) {}

    protected hintsSubject$: BehaviorSubject<HintButton[]>;
    hints$: Observable<HintButton[]>;

    protected displayedHintsContentSubject$: BehaviorSubject<string>;
    displayedHintsContent$: Observable<string>;

    protected displayedSolutionContentSubject$: BehaviorSubject<string>;
    displayedSolutionContent$: Observable<string>;

    protected isSolutionRevealedSubject$: BehaviorSubject<boolean>;
    isSolutionRevealed$: Observable<boolean>;

    protected isCorrectAnswerSubmittedSubject$: BehaviorSubject<boolean>;
    isCorrectAnswerSubmitted$: Observable<boolean>;

    protected isLoadingSubject$: BehaviorSubject<boolean>;
    isLoading$: Observable<boolean>;

    abstract submitAnswer(answer: string): Observable<any>;

    abstract revealSolution(level: TrainingLevel): Observable<string>;

    abstract revealHint(hint: Hint): Observable<Hint>;

    abstract getAccessFile(): Observable<boolean>;

    init(level: TrainingLevel, isLevelAnswered: boolean): void {
        this.initObservables(isLevelAnswered);
        this.initHints(level.hints);
        this.initSolutionState(level);
    }

    protected initObservables(isLevelAnswered: boolean): void {
        this.hintsSubject$ = new BehaviorSubject([]);
        this.hints$ = this.hintsSubject$.asObservable();
        this.displayedHintsContentSubject$ = new BehaviorSubject(undefined);
        this.displayedHintsContent$ = this.displayedHintsContentSubject$.asObservable();
        this.displayedSolutionContentSubject$ = new BehaviorSubject(undefined);
        this.displayedSolutionContent$ = this.displayedSolutionContentSubject$.asObservable();
        this.isSolutionRevealedSubject$ = new BehaviorSubject(false);
        this.isSolutionRevealed$ = this.isSolutionRevealedSubject$.asObservable();
        this.isCorrectAnswerSubmittedSubject$ = new BehaviorSubject(isLevelAnswered);
        this.isCorrectAnswerSubmitted$ = this.isCorrectAnswerSubmittedSubject$.asObservable();
        this.isLoadingSubject$ = new BehaviorSubject(false);
        this.isLoading$ = this.isLoadingSubject$.asObservable();
    }

    protected initSolutionState(level: TrainingLevel): void {
        if (level.hasSolution()) {
            this.isSolutionRevealedSubject$.next(true);
            this.onSolutionRevealed(level.solution);
        }
    }

    protected initHints(hints: Hint[]): void {
        const hintButtons: HintButton[] = [];
        hints.forEach((hint, index) => {
            hintButtons.push(new HintButton(hint.isRevealed(), hint));
            if (hint.isRevealed()) {
                this.addHintContent(hint, index + 1);
            }
        });
        this.hintsSubject$.next(hintButtons);
    }

    protected onHintRevealed(hint: Hint): void {
        const hintButtons = this.hintsSubject$.getValue();
        const hintToRevealIndex = hintButtons.findIndex((hintButton) => hintButton.hint.id === hint.id);
        if (hintToRevealIndex !== -1) {
            const hintToReveal = hintButtons[hintToRevealIndex];
            hintToReveal.disable();
            hintToReveal.hint = hint;
            hintButtons[hintToRevealIndex] = hintToReveal;
            this.hintsSubject$.next(hintButtons);
            this.addHintContent(hint, hintToRevealIndex + 1);
        }
    }

    protected addHintContent(hint: Hint, order: number): void {
        let content = this.displayedHintsContentSubject$.getValue();
        const hintContent = '\n\n## Hint ' + order + ': ' + hint.title + '\n' + hint.content;
        if (content) {
            content += hintContent;
        } else {
            content = hintContent;
        }
        this.displayedHintsContentSubject$.next(content);
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
        return this.runningTrainingRunService.next();
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

    protected displayTakeHintDialog(hint: Hint): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig(
                'Reveal Hint',
                `Do you want to reveal hint "${hint.title}"?
 It will cost you ${hint.penalty} points.`,
                'Cancel',
                'Reveal',
            ),
        });
        return dialogRef.afterClosed();
    }

    protected displayRevealSolutionDialog(solutionPenalized: boolean): Observable<SentinelDialogResultEnum> {
        let dialogMessage = 'Do you want to reveal solution of this level?';
        dialogMessage += solutionPenalized ? '\n All your points will be subtracted.' : '';

        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig('Reveal Solution', dialogMessage, 'Cancel', 'Reveal'),
        });
        return dialogRef.afterClosed();
    }
}
