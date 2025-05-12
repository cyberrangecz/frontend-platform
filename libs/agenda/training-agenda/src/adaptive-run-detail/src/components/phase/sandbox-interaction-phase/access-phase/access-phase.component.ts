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
import { AccessPhase } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { take } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdaptiveRunAccessPhaseService } from '../../../../services/adaptive-run/access-phase/adaptive-run-access-phase.service';
import { AdaptiveRunAccessPhaseConcreteService } from '../../../../services/adaptive-run/access-phase/adaptive-run-access-phase-concrete.service';

@Component({
    selector: 'crczp-access-phase',
    templateUrl: './access-phase.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: AdaptiveRunAccessPhaseService, useClass: AdaptiveRunAccessPhaseConcreteService }],
})
/**
 * Component to display training run's level of type ACCESS. Only displays markdown and allows user to continue immediately.
 */
export class AccessPhaseComponent implements OnChanges {
    @Input({ required: true }) phase: AccessPhase;
    @Input() isLast: boolean;
    @Input() isPhaseAnswered: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() localEnvironment: boolean;
    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;
    @Output() next: EventEmitter<void> = new EventEmitter();

    @ViewChild('rightPanel') rightPanel: ElementRef<HTMLDivElement>;

    isCorrectPasskeySubmitted$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    destroyRef = inject(DestroyRef);

    constructor(protected accessPhaseService: AdaptiveRunAccessPhaseService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes) {
            this.accessPhaseService.init(this.isPhaseAnswered);
            this.isCorrectPasskeySubmitted$ = this.accessPhaseService.isCorrectPasskeySubmitted$;
            this.isLoading$ = this.accessPhaseService.isLoading$;
        }
    }

    /**
     * Go to next level
     */
    onNext(): void {
        this.next.emit();
    }

    /**
     * Calls service to check whether the passkey is correct
     */
    onAnswerSubmitted(answer: string): void {
        this.accessPhaseService.submitPasskey(answer).pipe(take(1)).subscribe();
    }

    /**
     * Calls service to download access configuration file
     */
    onAccessFileRequested(): void {
        this.accessPhaseService.getAccessFile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    protected readonly of = of;
}
