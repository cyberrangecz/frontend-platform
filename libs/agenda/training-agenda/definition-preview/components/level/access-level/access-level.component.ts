import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AccessLevel} from '@crczp/training-model';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    selector: 'crczp-access-level',
    templateUrl: './access-level.component.html',
    styleUrls: ['./access-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent
    ]
})
export class AccessLevelComponent {
    @Input() level: AccessLevel;
}
