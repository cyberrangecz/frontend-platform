import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AccessPhaseTask} from '../../../model/phase/access-phase/access-phase-task';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'crczp-access-task-preview',
    templateUrl: './access-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent
    ]
})
export class AccessTaskPreviewComponent {
    @Input() task?: AccessPhaseTask;
    @Input() localEnvironment?: boolean;
}
