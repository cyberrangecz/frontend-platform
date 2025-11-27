import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TrainingPhaseTask } from '../../../model/phase/training-phase/training-phase-task';
import { SentinelMarkdownViewComponent } from '@sentinel/components/markdown-view';

@Component({
    selector: 'crczp-training-task-preview',
    templateUrl: './training-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelMarkdownViewComponent],
})
export class TrainingTaskPreviewComponent {
    @Input() task?: TrainingPhaseTask;
}
