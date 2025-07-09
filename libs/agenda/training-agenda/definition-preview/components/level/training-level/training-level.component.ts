import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TrainingLevel} from '@crczp/training-model';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    selector: 'crczp-training-level',
    templateUrl: './training-level.component.html',
    styleUrls: ['./training-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent
    ]
})
/**
 * Component of a training level in a training run. Users needs to find out correct solution (answer) and submit it
 * before he can continue to the next level. User can optionally take hints.
 */
export class TrainingLevelComponent {
    @Input() level: TrainingLevel;
}
