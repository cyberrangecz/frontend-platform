import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum, QuestionTypeEnum} from '@crczp/training-model';
import {QuestionChangeEvent} from '../../../../../../model/events/question-change-event';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {MultipleChoiceQuestionEditComponent} from "../multiple-choice-question/multiple-choice-question-edit.component";
import {FreeFormQuestionEditComponent} from "../free-form-question/free-form-question-edit.component";
import {RatingFormQuestionEditComponent} from "../rating-form-question/rating-form-question-edit.component";
import {MatCheckbox} from "@angular/material/checkbox";
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";
import {FormsModule} from "@angular/forms";
import {NgIf} from "@angular/common";

@Component({
    selector: 'crczp-adaptive-question-edit',
    templateUrl: './question-edit.component.html',
    styleUrls: ['./question-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCardContent,
        MultipleChoiceQuestionEditComponent,
        FreeFormQuestionEditComponent,
        RatingFormQuestionEditComponent,
        MatCheckbox,
        SentinelMarkdownViewComponent,
        MatCardTitle,
        MatCardHeader,
        MatCard,
        FormsModule,
        NgIf
    ]
})
export class QuestionEditComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionnaireTypeEnum;
    @Input() index: number;

    @Output() delete: EventEmitter<number> = new EventEmitter();
    @Output() questionChange: EventEmitter<QuestionChangeEvent> = new EventEmitter();

    questionTypes = QuestionTypeEnum;

    /**
     * Passes received event to parent component
     * @param question changed question
     */
    questionChanged(question: AdaptiveQuestion): void {
        this.questionChange.emit(new QuestionChangeEvent(question, this.index));
    }

    /**
     * Emits event to delete selected question
     * @param i index of question to delete
     */
    onDelete(i: number): void {
        this.delete.emit(i);
    }
}
