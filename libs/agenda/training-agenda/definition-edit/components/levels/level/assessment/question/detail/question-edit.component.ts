import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import {ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question} from '@crczp/training-model';
import {QuestionChangeEvent} from '../../../../../../model/events/question-change-event';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";
import {MatCheckbox} from "@angular/material/checkbox";
import {FormsModule} from "@angular/forms";
import {MultipleChoiceQuestionEditComponent} from "../multiple-choice-question/multiple-choice-question-edit.component";
import {FreeFormQuestionEditComponent} from "../free-form-question/free-form-question-edit.component";
import {ExtendedMatchingItemsEditComponent} from "../extended-matching-items/extended-matching-items-edit.component";
import {MatButton} from "@angular/material/button";

/**
 * Wrapper component of a specific question type edit component. Resolves type of the question and creates sub component accordingly
 */
@Component({
    selector: 'crczp-question-edit',
    templateUrl: './question-edit.component.html',
    styleUrls: ['./question-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardHeader,
        MatCardTitle,
        SentinelMarkdownViewComponent,
        MatCheckbox,
        FormsModule,
        MatCardContent,
        MultipleChoiceQuestionEditComponent,
        FreeFormQuestionEditComponent,
        ExtendedMatchingItemsEditComponent,
        MatCardActions,
        MatButton
    ]
})
export class QuestionEditComponent implements OnChanges {
    @Input() question: Question;
    @Input() isTest: boolean;
    @Input() index: number;

    @Output() delete: EventEmitter<number> = new EventEmitter();
    @Output() questionChange: EventEmitter<QuestionChangeEvent> = new EventEmitter();

    isFfq = false;
    isMcq = false;
    isEmi = false;

    ngOnChanges(changes: SimpleChanges): void {
        if ('question' in changes) {
            this.resolveQuestionType();
        }
    }

    /**
     * Passes received event to parent component
     * @param question changed question
     */
    questionChanged(question: Question): void {
        this.questionChange.emit(new QuestionChangeEvent(question, this.index));
    }

    /**
     * Emits event to delete selected question
     * @param i index of question to delete
     */
    onDelete(i: number): void {
        this.delete.emit(i);
    }

    private resolveQuestionType() {
        this.isFfq = this.question instanceof FreeFormQuestion;
        this.isEmi = this.question instanceof ExtendedMatchingItems;
        this.isMcq = this.question instanceof MultipleChoiceQuestion;
    }
}
