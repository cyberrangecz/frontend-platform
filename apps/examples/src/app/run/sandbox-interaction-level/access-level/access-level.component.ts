import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    Output,
    ViewChild,
} from '@angular/core';
import { AccessLevel } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { GenericSandboxLevelComponent } from '../generic-sandbox-level/generic-sandbox-level.component';
import {
    PersistentDividerPositionSynchronizerService,
    TopologySplitViewSynchronizerService,
} from '@crczp/topology-graph';

@Component({
    selector: 'crczp-access-level',
    templateUrl: './access-level.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [GenericSandboxLevelComponent],
    providers: [
        {
            provide: TopologySplitViewSynchronizerService,
            useFactory: () =>
                new PersistentDividerPositionSynchronizerService(),
        },
    ],
})
/**
 * Component to display training run's level of type ACCESS. Only displays markdown and allows user to continue immediately.
 */
export class AccessLevelComponent {
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
    protected readonly of = of;

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
        //
    }

    /**
     * Calls service to download access configuration file
     */
    onAccessFileRequested(): void {
        //
    }
}
