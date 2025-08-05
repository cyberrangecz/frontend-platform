import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AccessPhaseTask } from '@crczp/visualization-model';

@Component({
    selector: 'crczp-access-task-preview',
    templateUrl: './access-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessTaskPreviewComponent {
    @Input() task?: AccessPhaseTask;
    @Input() localEnvironment?: boolean;
}
