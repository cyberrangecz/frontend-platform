import {Component, Input} from '@angular/core';
import {QuestionTypeEnum} from '../../../../model/enums/question-type.enum';
import {QuestionnaireTypeEnum} from '../../../../model/enums/questionnaire-type.enum';
import {AdaptiveQuestion} from '../../../../model/phase/questionnaire-phase/adaptive-question';
import {
    MultipleChoiceQuestionDetailComponent
} from "./multiple-choice-question-detail/multiple-choice-question-detail.component";
import {FreeFormQuestionDetailComponent} from "./free-form-question-detail/free-form-question-detail.component";
import {RatingFormQuestionDetailComponent} from "./rating-form-question-detail/rating-form-question-detail.component";

@Component({
    selector: 'crczp-question-detail',
    templateUrl: './abstract-question.component.html',
    styleUrls: ['./abstract-question.component.css'],
    imports: [
        MultipleChoiceQuestionDetailComponent,
        FreeFormQuestionDetailComponent,
        RatingFormQuestionDetailComponent
    ]
})
export class AbstractQuestionComponent {
    @Input() question!: AdaptiveQuestion;
    @Input() questionnaireType!: QuestionnaireTypeEnum;

    readonly QuestionTypeEnum = QuestionTypeEnum;
}
