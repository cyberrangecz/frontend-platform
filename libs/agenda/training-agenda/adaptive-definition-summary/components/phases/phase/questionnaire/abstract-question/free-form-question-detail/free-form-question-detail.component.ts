import {Component, Input} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum} from '@crczp/training-model';
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-free-form-question-detail',
    templateUrl: './free-form-question-detail.component.html',
    styleUrls: ['./free-form-question-detail.component.css'],
    imports: [
        MatIcon,
        MatTooltip
    ]
})
export class FreeFormQuestionDetailComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;

    readonly QuestionnaireTypeEnum = QuestionnaireTypeEnum;
}
