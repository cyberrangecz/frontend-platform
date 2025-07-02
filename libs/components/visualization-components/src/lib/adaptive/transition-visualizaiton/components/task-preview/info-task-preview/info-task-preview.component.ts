import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {InfoPhaseTask} from '@crczp/visualization-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'crczp-info-task-preview',
    templateUrl: './info-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoTaskPreviewComponent {
    @Input() task?: InfoPhaseTask;
}
