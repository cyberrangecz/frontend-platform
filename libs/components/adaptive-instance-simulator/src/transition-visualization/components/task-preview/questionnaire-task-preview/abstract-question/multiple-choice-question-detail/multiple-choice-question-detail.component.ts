import {Component, Input} from '@angular/core';
import {QuestionnaireTypeEnum} from '../../../../../model/enums/questionnaire-type.enum';
import {AdaptiveQuestion} from '../../../../../model/phase/questionnaire-phase/adaptive-question';
import {MatDivider} from "@angular/material/divider";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-multiple-choice-question-detail',
    templateUrl: './multiple-choice-question-detail.component.html',
    styleUrls: ['./multiple-choice-question-detail.component.css'],
    imports: [
        MatIcon,
        MatDivider
    ]
})
export class MultipleChoiceQuestionDetailComponent {
    @Input() question!: AdaptiveQuestion;
    @Input() questionnaireType!: QuestionnaireTypeEnum;

    readonly QuestionnaireTypeEnum = QuestionnaireTypeEnum;
}
