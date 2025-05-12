import { Component, Input } from '@angular/core';
import { ExtendedMatchingItems } from '@crczp/training-model';

@Component({
    selector: 'crczp-extended-matching-question-detail',
    templateUrl: './extended-matching-question-detail.component.html',
    styleUrls: ['./extended-matching-question-detail.component.css'],
})
export class ExtendedMatchingQuestionDetailComponent {
    @Input() question: ExtendedMatchingItems;
    @Input() isTest: boolean;
}
