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
import {Observable, of} from 'rxjs';
import {delay, take} from 'rxjs/operators';
import {TrainingPhase} from '@crczp/training-model';
import {
    AdaptiveRunTrainingPhaseService
} from '../../../../services/adaptive-run/training-phase/adaptive-run-training-phase.service';
import {
    AdaptiveRunTrainingPhaseConcreteService
} from '../../../../services/adaptive-run/training-phase/adaptive-run-training-phase-concrete.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AnswerFormHintsComponent, GenericSandboxLevelComponent} from "@crczp/training-agenda/run-detail";

@Component({
    selector: 'crczp-training-phase',
    templateUrl: './training-phase.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{provide: AdaptiveRunTrainingPhaseService, useClass: AdaptiveRunTrainingPhaseConcreteService}],
    imports: [
        GenericSandboxLevelComponent,
        AnswerFormHintsComponent
    ]
})
/**
 * Component of a training level in a training run. Users needs to find out correct solution (answer) and submit it
 * before he can continue to the next level. User can optionally take hints.
 */
export class TrainingPhaseComponent implements OnChanges {
    @Input({required: true}) phase: TrainingPhase;
    @Input() isLast: boolean;
    @Input() isPhaseAnswered: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;
    @Output() next: EventEmitter<void> = new EventEmitter();

    @ViewChild('rightPanel') rightPanel: ElementRef<HTMLDivElement>;

    isCorrectAnswerSubmitted$: Observable<boolean>;
    isSolutionRevealed$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    displayedSolutionContent$: Observable<string>;
    destroyRef = inject(DestroyRef);
    protected readonly of = of;

    constructor(protected trainingPhaseService: AdaptiveRunTrainingPhaseService) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes) {
            this.trainingPhaseService.init(this.phase, this.isPhaseAnswered);
            this.isCorrectAnswerSubmitted$ = this.trainingPhaseService.isCorrectAnswerSubmitted$;
            this.isSolutionRevealed$ = this.trainingPhaseService.isSolutionRevealed$;
            this.isLoading$ = this.trainingPhaseService.isLoading$;
            this.displayedSolutionContent$ = this.trainingPhaseService.displayedSolutionContent$;
        }
    }

    /**
     * Calls service to check whether the passkey is correct
     */
    onAnswerSubmitted(answer: string): void {
        this.trainingPhaseService.submitAnswer(answer).pipe(take(1)).subscribe();
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
        this.trainingPhaseService.getAccessFile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Calls service to reveal solution
     */
    revealSolution(): void {
        this.trainingPhaseService
            .revealSolution()
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
}
