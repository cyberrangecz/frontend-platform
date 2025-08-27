import {
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    Output,
    TemplateRef,
} from '@angular/core';
import { AnswerFormHintsComponent } from '../subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import { Observable, of } from 'rxjs';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { FloatingAnswerFormComponent } from '../subcomponents/answer-floating-form/floating-answer-form.component';
import { SentinelMarkdownViewComponent } from '@sentinel/components/markdown-view';
import { TopologyWrapperComponent } from '../subcomponents/topology-wrapper/topology-wrapper.component';
import { SandboxLevelSplitPanel } from '@crczp/components';
import { DividerPositionSynchronizerService } from '@crczp/utils';

@Component({
    selector: 'crczp-generic-sandbox-level',
    templateUrl: './generic-sandbox-level.component.html',
    styleUrl: './generic-sandbox-level.component.css',
    imports: [
        AsyncPipe,
        SandboxLevelSplitPanel,
        NgTemplateOutlet,
        MatButton,
        FloatingAnswerFormComponent,
        SentinelMarkdownViewComponent,
        TopologyWrapperComponent,
    ],
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
    protected dividerPositionSynchronizer = inject(
        DividerPositionSynchronizerService
    );
    protected readonly window = window;
}
