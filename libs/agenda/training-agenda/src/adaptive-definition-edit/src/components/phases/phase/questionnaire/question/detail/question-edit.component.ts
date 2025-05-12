import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { QuestionTypeEnum } from '@crczp/training-model';
import { AdaptiveQuestion } from '@crczp/training-model/lib/phase/questionnaire-phase/adaptive-question';
import { QuestionChangeEvent } from '../../../../../../model/events/question-change-event';

@Component({
    selector: 'crczp-adaptive-question-edit',
    templateUrl: './question-edit.component.html',
    styleUrls: ['./question-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionEditComponent {
    @Input() question: AdaptiveQuestion;
    @Input() questionnaireType: QuestionTypeEnum;
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
