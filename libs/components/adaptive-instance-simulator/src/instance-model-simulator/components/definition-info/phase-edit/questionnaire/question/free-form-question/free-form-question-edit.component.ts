import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum} from '@crczp/training-model';
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";
import {NgForOf, NgIf} from "@angular/common";
import {MatFormField, MatInput} from "@angular/material/input";

@Component({
    selector: 'crczp-adaptive-free-form-question-edit',
    templateUrl: './free-form-question-edit.component.html',
    styleUrls: ['./free-form-question-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownEditorComponent,
        NgIf,
        NgForOf,
        MatFormField,
        MatInput
    ]
})
/**
 * Component for editing a question of type Free Form
 */
export class FreeFormQuestionEditComponent {
    @Input() index: number;
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;

    questionnaireTypes = QuestionnaireTypeEnum;
}
