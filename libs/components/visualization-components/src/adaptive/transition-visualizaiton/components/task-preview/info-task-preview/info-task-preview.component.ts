import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { InfoPhaseTask } from '@crczp/visualization-model';

@Component({
    selector: 'crczp-info-task-preview',
    templateUrl: './info-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoTaskPreviewComponent {
    @Input() task?: InfoPhaseTask;
}
