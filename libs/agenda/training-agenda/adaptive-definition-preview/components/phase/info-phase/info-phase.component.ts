import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {InfoPhase} from '@crczp/training-model';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    selector: 'crczp-info-phase',
    templateUrl: './info-phase.component.html',
    styleUrls: ['./info-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent
    ]
})
export class InfoPhaseComponent {
    @Input() phase: InfoPhase;
}
