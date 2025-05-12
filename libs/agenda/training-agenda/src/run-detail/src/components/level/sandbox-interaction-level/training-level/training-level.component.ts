import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, take } from 'rxjs/operators';
import { HintButton } from '@crczp/training-agenda/internal';
import { Hint, TrainingLevel } from '@crczp/training-model';
import { TrainingRunTrainingLevelService } from '../../../../services/training-run/level/training/training-run-training-level.service';
import { TrainingRunTrainingLevelConcreteService } from '../../../../services/training-run/level/training/training-run-training-level-concrete.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-training-level',
    templateUrl: './training-level.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: TrainingRunTrainingLevelService, useClass: TrainingRunTrainingLevelConcreteService }],
})
/**
 * Component of a training level in a training run. Users needs to find out correct solution (answer) and submit it
 * before he can continue to the next level. User can optionally take hints.
 */
export class TrainingLevelComponent implements OnChanges {
    @Input({ required: true }) level: TrainingLevel;
    @Input() isLast: boolean;
    @Input() isLevelAnswered: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;
    @Output() next: EventEmitter<void> = new EventEmitter();

    @ViewChild('rightPanel') rightPanel: ElementRef<HTMLDivElement>;

    displayedHintsContent$: Observable<string>;
    isCorrectAnswerSubmitted$: Observable<boolean>;
    isSolutionRevealed$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    hintsButtons$: Observable<HintButton[]>;
    displayedSolutionContent$: Observable<string>;
    destroyRef = inject(DestroyRef);

    constructor(protected trainingLevelService: TrainingRunTrainingLevelService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if ('level' in changes) {
            this.trainingLevelService.init(this.level, this.isLevelAnswered);
            this.displayedHintsContent$ = this.trainingLevelService.displayedHintsContent$;
            this.isCorrectAnswerSubmitted$ = this.trainingLevelService.isCorrectAnswerSubmitted$;
            this.isSolutionRevealed$ = this.trainingLevelService.isSolutionRevealed$;
            this.isLoading$ = this.trainingLevelService.isLoading$;
            this.hintsButtons$ = this.trainingLevelService.hints$;
            this.displayedSolutionContent$ = this.trainingLevelService.displayedSolutionContent$;
        }
    }

    /**
     * Calls service to check whether the passkey is correct
     */
    onAnswerSubmitted(answer: string): void {
        this.trainingLevelService.submitAnswer(answer).pipe(take(1)).subscribe();
    }

    /**
     * Go to next level
     */
    onNext(): void {
        this.next.emit();
    }

    /**
     * Calls service to download access configuration file
     */
    onAccessFileRequested(): void {
        this.trainingLevelService.getAccessFile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Calls service to reveal hint
     * @param hint hint revealed by the user
     */
    revealHint(hint: Hint): void {
        this.trainingLevelService
            .revealHint(hint)
            .pipe(take(1), delay(50))
            .subscribe(() => this.scrollToBottom());
    }

    /**
     * Get observable of content of hint buttons
     */
    getHints$() {
        return this.trainingLevelService.hints$;
    }

    /**
     * Calls service to reveal solution
     */
    revealSolution(): void {
        this.trainingLevelService
            .revealSolution(this.level)
            .pipe(take(1), delay(50))
            .subscribe(() => this.scrollToBottom());
    }

    private scrollToBottom(): void {
        window.scrollTo({
            left: 0,
            top: document.body.scrollHeight,
            behavior: 'smooth',
        });
    }

    protected readonly of = of;
}
