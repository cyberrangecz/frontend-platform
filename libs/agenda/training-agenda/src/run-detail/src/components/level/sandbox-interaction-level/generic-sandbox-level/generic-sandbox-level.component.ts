import { Component, DestroyRef, EventEmitter, inject, Input, Output, TemplateRef } from '@angular/core';
import { AnswerFormHintsComponent } from '../subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import { Observable, of } from 'rxjs';
import { DividerPositionSynchronizerService } from '../../../../services/training-run/level/synchronization/divider-position/divider-position-synchronizer.service';

@Component({
    selector: 'crczp-generic-sandbox-level',
    templateUrl: './generic-sandbox-level.component.html',
    styleUrl: './generic-sandbox-level.component.css',
})
export class GenericSandboxLevelComponent {
    @Input({ required: true }) levelContent: string;

    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() isLoading: Observable<boolean> = of(false);
    @Input() isCorrectAnswerSubmitted$: Observable<boolean> = of(false);
    @Input() isSolutionRevealed$: Observable<boolean> = of(false);

    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;

    @Input() displayedSolutionContent$: Observable<string> = of();
    @Input() displayedHintsContent$: Observable<string> = of();
    @Input() hints!: TemplateRef<AnswerFormHintsComponent>;

    @Output() getAccessFile: EventEmitter<void> = new EventEmitter();
    @Output() next: EventEmitter<void> = new EventEmitter();
    @Output() answerSubmitted: EventEmitter<string> = new EventEmitter();

    destroyRef = inject(DestroyRef);

    constructor(protected dividerPositionSynchronizer: DividerPositionSynchronizerService) {}

    protected readonly window = window;
}
