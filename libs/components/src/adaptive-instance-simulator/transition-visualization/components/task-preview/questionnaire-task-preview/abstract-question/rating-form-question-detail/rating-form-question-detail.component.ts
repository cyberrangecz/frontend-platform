import {Component, Input} from '@angular/core';
import {QuestionnaireTypeEnum} from '../../../../../model/enums/questionnaire-type.enum';
import {AdaptiveQuestion} from '../../../../../model/phase/questionnaire-phase/adaptive-question';
import {MatDivider} from "@angular/material/divider";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-rating-form-question-detail',
    templateUrl: './rating-form-question-detail.component.html',
    styleUrls: ['./rating-form-question-detail.component.css'],
    imports: [
        MatIcon,
        MatDivider
    ]
})
export class RatingFormQuestionDetailComponent {
    @Input() question!: AdaptiveQuestion;
    @Input() questionnaireType!: QuestionnaireTypeEnum;

    readonly QuestionnaireTypeEnum = QuestionnaireTypeEnum;
}
