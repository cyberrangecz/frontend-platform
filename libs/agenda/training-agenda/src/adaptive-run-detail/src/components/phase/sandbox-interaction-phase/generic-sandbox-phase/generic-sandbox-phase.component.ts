import { Component, DestroyRef, EventEmitter, inject, Input, Output, TemplateRef } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DividerPositionSynchronizerService } from '../../../../services/adaptive-run/synchronization/divider-position/divider-position-synchronizer.service';
import { AnswerFormHintsComponent } from '../subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';

@Component({
    selector: 'crczp-generic-sandbox-phase',
    templateUrl: './generic-sandbox-phase.component.html',
    styleUrl: './generic-sandbox-phase.component.css',
})
export class GenericSandboxPhaseComponent {
    @Input({ required: true }) levelContent: string;

    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() isLoading: Observable<boolean> = of(false);
    @Input() isSolutionRevealed$: Observable<boolean> = of(false);
    @Input() isCorrectAnswerSubmitted$: Observable<boolean> = of(false);

    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;

    @Input() displayedSolutionContent$: Observable<string> = of();
    @Input() hints!: TemplateRef<AnswerFormHintsComponent>;

    @Output() getAccessFile: EventEmitter<void> = new EventEmitter();
    @Output() next: EventEmitter<void> = new EventEmitter();
    @Output() answerSubmitted: EventEmitter<string> = new EventEmitter();

    destroyRef = inject(DestroyRef);

    constructor(protected dividerPositionSynchronizer: DividerPositionSynchronizerService) {}

    protected readonly window = window;
}
