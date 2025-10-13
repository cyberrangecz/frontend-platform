import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {ExtendedMatchingItems} from '@crczp/training-model';
import {MatRadioButton, MatRadioGroup} from "@angular/material/radio";
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    selector: 'crczp-trainee-extended-matching-items',
    templateUrl: './extended-matching-items-trainee.component.html',
    styleUrls: ['./extended-matching-items-trainee.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatRadioGroup,
        MatRadioButton,
        SentinelMarkdownViewComponent
    ]
})
export class ExtendedMatchingItemsTraineeComponent {
    @Input() question: ExtendedMatchingItems;
    @Input() index: number;
}
