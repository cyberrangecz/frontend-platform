import {Component, Input} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum, QuestionTypeEnum} from '@crczp/training-model';
import {RatingFormQuestionDetailComponent} from "./rating-form-question-detail/rating-form-question-detail.component";
import {
    MultipleChoiceQuestionDetailComponent
} from "./multiple-choice-question-detail/multiple-choice-question-detail.component";
import {FreeFormQuestionDetailComponent} from "./free-form-question-detail/free-form-question-detail.component";

@Component({
    selector: 'crczp-question-detail',
    templateUrl: './abstract-question.component.html',
    styleUrls: ['./abstract-question.component.css'],
    imports: [
        RatingFormQuestionDetailComponent,
        MultipleChoiceQuestionDetailComponent,
        FreeFormQuestionDetailComponent
    ]
})
export class AbstractQuestionComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;

    readonly QuestionTypeEnum = QuestionTypeEnum;
}
