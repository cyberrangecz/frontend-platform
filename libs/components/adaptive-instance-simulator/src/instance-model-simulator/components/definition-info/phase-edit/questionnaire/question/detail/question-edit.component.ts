import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum, QuestionTypeEnum} from '@crczp/training-model';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {MultipleChoiceQuestionEditComponent} from "../multiple-choice-question/multiple-choice-question-edit.component";
import {FreeFormQuestionEditComponent} from "../free-form-question/free-form-question-edit.component";
import {RatingFormQuestionEditComponent} from "../rating-form-question/rating-form-question-edit.component";

@Component({
    selector: 'crczp-adaptive-question-edit',
    templateUrl: './question-edit.component.html',
    styleUrls: ['./question-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardHeader,
        MatCardTitle,
        MatCardContent,
        MultipleChoiceQuestionEditComponent,
        FreeFormQuestionEditComponent,
        RatingFormQuestionEditComponent
    ]
})
export class QuestionEditComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;
    @Input() index: number;

    questionTypes = QuestionTypeEnum;
}
