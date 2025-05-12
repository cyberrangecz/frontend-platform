import { Component, Input } from '@angular/core';
import { AdaptiveQuestion, QuestionnaireTypeEnum } from '@crczp/training-model';

@Component({
    selector: 'crczp-multiple-choice-question-detail',
    templateUrl: './multiple-choice-question-detail.component.html',
    styleUrls: ['./multiple-choice-question-detail.component.css'],
})
export class MultipleChoiceQuestionDetailComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;

    readonly QuestionnaireTypeEnum = QuestionnaireTypeEnum;
}
