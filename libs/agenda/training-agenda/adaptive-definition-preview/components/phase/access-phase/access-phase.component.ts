import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AccessPhase} from '@crczp/training-model';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    selector: 'crczp-access-phase',
    templateUrl: './access-phase.component.html',
    styleUrls: ['./access-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent
    ]
})
export class AccessPhaseComponent {
    @Input() phase: AccessPhase;
}
