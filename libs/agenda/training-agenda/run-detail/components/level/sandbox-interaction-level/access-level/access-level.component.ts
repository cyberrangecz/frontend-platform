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
import { AccessLevel } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { GenericSandboxLevelComponent } from '../generic-sandbox-level/generic-sandbox-level.component';
import { TrainingRunAccessLevelService } from '../../../../services/training-run/level/access/training-run-access-level.service';
import { take } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrainingRunAccessLevelConcreteService } from '../../../../services/training-run/level/access/training-run-access-level-concrete.service';

@Component({
    selector: 'crczp-access-level',
    templateUrl: './access-level.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [GenericSandboxLevelComponent],
    providers: [
        {
            provide: TrainingRunAccessLevelService,
            useClass: TrainingRunAccessLevelConcreteService,
        },
    ],
})
/**
 * Component to display training run's level of type ACCESS. Only displays markdown and allows user to continue immediately.
 */
export class AccessLevelComponent implements OnChanges {
    @Input({ required: true }) level: AccessLevel;
    @Input() isLast: boolean;
    @Input() isLevelAnswered: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;
    @Input() localEnvironment: boolean;
    @Output() next: EventEmitter<void> = new EventEmitter();
    @ViewChild('rightPanel') rightPanel: ElementRef<HTMLDivElement>;
    isCorrectPasskeySubmitted$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    protected accessLevelService = inject(TrainingRunAccessLevelService);
    protected readonly of = of;

    ngOnChanges(changes: SimpleChanges): void {
        if ('level' in changes) {
            this.accessLevelService.init(this.isLevelAnswered);
            this.isCorrectPasskeySubmitted$ =
                this.accessLevelService.isCorrectPasskeySubmitted$;
            this.isLoading$ = this.accessLevelService.isLoading$;
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
        this.accessLevelService.submitPasskey(answer).pipe(take(1)).subscribe();
    }

    /**
     * Calls service to download access configuration file
     */
    onAccessFileRequested(): void {
        this.accessLevelService
            .getAccessFile()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
