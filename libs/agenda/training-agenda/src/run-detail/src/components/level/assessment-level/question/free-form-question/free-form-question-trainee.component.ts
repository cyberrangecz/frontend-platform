import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FreeFormQuestion, Question } from '@crczp/training-model';

@Component({
    selector: 'crczp-trainee-free-form-question',
    templateUrl: './free-form-question-trainee.component.html',
    styleUrls: ['./free-form-question-trainee.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component displaying FFQ type of question in the assessment level of a trainees training run.
 * If assessment is type of test or question is required, user needs to answer it, otherwise it is optional.
 */
export class FreeFormQuestionTraineeComponent implements OnInit {
    @Input() question: FreeFormQuestion;
    @Input() index: number;
    @Input() isBacktracked: boolean;

    @Output() contentChanged: EventEmitter<{ index: number; question: Question }> = new EventEmitter();
    answer: string;

    ngOnInit(): void {
        if (this.question.userAnswers) {
            this.answer = this.question.userAnswers.toString();
        }
    }

    /**
     * Checks whether mandatory questions were answered
     */
    canBeSubmitted(): boolean {
        return !this.question.required || (this.answer && this.answer.replace(/\s/g, '') !== '');
    }

    onChange(): void {
        this.contentChanged.emit({
            index: this.index,
            question: this.question,
        });
    }

    /**
     * Saves changes from user input to question object
     */
    saveChanges(): void {
        this.question.userAnswers = [this.answer];
    }
}
