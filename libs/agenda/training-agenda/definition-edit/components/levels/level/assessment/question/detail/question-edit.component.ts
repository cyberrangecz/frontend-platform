import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import { ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question } from '@crczp/training-model';
import { QuestionChangeEvent } from '../../../../../../model/events/question-change-event';

/**
 * Wrapper component of a specific question type edit component. Resolves type of the question and creates sub component accordingly
 */
@Component({
    selector: 'crczp-question-edit',
    templateUrl: './question-edit.component.html',
    styleUrls: ['./question-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
