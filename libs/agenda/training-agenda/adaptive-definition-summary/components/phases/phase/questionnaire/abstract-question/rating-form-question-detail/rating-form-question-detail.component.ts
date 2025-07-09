import {Component, Input} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum} from '@crczp/training-model';
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-rating-form-question-detail',
    templateUrl: './rating-form-question-detail.component.html',
    styleUrls: ['./rating-form-question-detail.component.css'],
    imports: [
        MatIcon,
        MatTooltip
    ]
})
export class RatingFormQuestionDetailComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;

    readonly QuestionnaireTypeEnum = QuestionnaireTypeEnum;
}
