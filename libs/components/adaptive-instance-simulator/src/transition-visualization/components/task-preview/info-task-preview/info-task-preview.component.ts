import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {InfoPhaseTask} from '../../../model/phase/info-phase/info-phase-task';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'crczp-info-task-preview',
    templateUrl: './info-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent
    ]
})
export class InfoTaskPreviewComponent {
    @Input() task?: InfoPhaseTask;
}
