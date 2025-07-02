import {Component, DestroyRef, EventEmitter, inject, Input, Output, TemplateRef} from '@angular/core';
import {
    AnswerFormHintsComponent
} from '../subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import {async, Observable, of} from 'rxjs';
import {AsyncPipe} from "@angular/common";
import {DividerPositionSynchronizerService, SplitContainerComponent} from "@crczp/common";

@Component({
    selector: 'crczp-generic-sandbox-level',
    templateUrl: './generic-sandbox-level.component.html',
    styleUrl: './generic-sandbox-level.component.css',
    imports: [
        AsyncPipe,
        SplitContainerComponent
    ]
})
export class GenericSandboxLevelComponent {
    protected dividerPositionSynchronizer = inject(DividerPositionSynchronizerService);

    @Input({required: true}) levelContent: string;

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
    protected readonly window = window;
    protected readonly async = async;
}
