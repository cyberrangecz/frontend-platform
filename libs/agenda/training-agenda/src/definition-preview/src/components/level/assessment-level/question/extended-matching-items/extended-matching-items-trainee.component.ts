import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ExtendedMatchingItems } from '@crczp/training-model';

@Component({
    selector: 'crczp-trainee-extended-matching-items',
    templateUrl: './extended-matching-items-trainee.component.html',
    styleUrls: ['./extended-matching-items-trainee.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtendedMatchingItemsTraineeComponent {
    @Input() question: ExtendedMatchingItems;
    @Input() index: number;
}
