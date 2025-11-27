import {Component, EventEmitter, Input, Output} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum} from '@crczp/training-model';
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";

import {MatCheckbox} from "@angular/material/checkbox";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-adaptive-multiple-choice-question-edit',
    templateUrl: './multiple-choice-question-edit.component.html',
    styleUrls: ['./multiple-choice-question-edit.component.css'],
    imports: [
    SentinelMarkdownEditorComponent,
    MatCheckbox,
    MatLabel,
    MatInput,
    MatTooltip,
    MatFormField
]
})
/**
 * Component for editing a question of type Multiple Choice
 */
export class MultipleChoiceQuestionEditComponent {
    @Input() index: number;
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;
    @Output() questionChange: EventEmitter<AdaptiveQuestion> = new EventEmitter();

    questionnaireTypes = QuestionnaireTypeEnum;
}
