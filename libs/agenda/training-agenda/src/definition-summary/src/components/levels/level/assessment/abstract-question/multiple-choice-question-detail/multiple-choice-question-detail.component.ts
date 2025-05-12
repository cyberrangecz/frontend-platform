import { Component, Input } from '@angular/core';
import { MultipleChoiceQuestion } from '@crczp/training-model';

@Component({
    selector: 'crczp-multiple-choice-question-detail',
    templateUrl: './multiple-choice-question-detail.component.html',
    styleUrls: ['./multiple-choice-question-detail.component.css'],
})
export class MultipleChoiceQuestionDetailComponent {
    @Input() question: MultipleChoiceQuestion;
    @Input() isTest: boolean;
}
