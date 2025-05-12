import { Component, Input } from '@angular/core';
import { AdaptiveQuestion, QuestionnaireTypeEnum } from '@crczp/training-model';

@Component({
    selector: 'crczp-rating-form-question-detail',
    templateUrl: './rating-form-question-detail.component.html',
    styleUrls: ['./rating-form-question-detail.component.css'],
})
export class RatingFormQuestionDetailComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;

    readonly QuestionnaireTypeEnum = QuestionnaireTypeEnum;
}
