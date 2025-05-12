import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MultipleChoiceQuestion, Question } from '@crczp/training-model';
import { QuestionChoice } from '@crczp/training-model/lib/questions/question-choice';

@Component({
    selector: 'crczp-trainee-multiple-choice-question',
    templateUrl: './multiple-choice-question-trainee.component.html',
    styleUrls: ['./multiple-choice-question-trainee.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component displaying MCQ type of question in the assessment level of a trainees training run.
 * If is assessment is a test or question is required, it needs to be filled, otherwise it is optional.
 */
export class MultipleChoiceQuestionTraineeComponent {
    @Input() question: MultipleChoiceQuestion;
    @Input() index: number;
    @Input() isBacktracked: boolean;

    @Output() contentChanged: EventEmitter<{ index: number; question: Question }> = new EventEmitter();

    userAnswers: string[] = [];

    /**
     * Checks whether mandatory questions were answered
     */
    canBeSubmitted(): boolean {
        return !this.question.required || this.userAnswers.length > 0;
    }

    /**
     * Saves changes from user input to question object
     */
    saveChanges(): void {
        this.question.userAnswers = this.userAnswers;
    }

    /**
     * Called when user changed the answer (clicked on a checkbox
     * @param event event of checkbox change
     * @param answer user answer which has been changed
     */
    onAnswerChanged(event: MatCheckboxChange, answer: string): void {
        if (event.checked) {
            this.addCorrectAnswer(answer);
        } else {
            this.removeCorrectAnswer(answer);
        }
        this.contentChanged.emit({
            index: this.index,
            question: this.question,
        });
    }

    checkedAsAnswered(option: QuestionChoice): boolean {
        return this.question.userAnswers.findIndex((answer: string) => answer === option.text) != -1;
    }

    /**
     * Adds correct answer
     * @param answer user answer which should be marked as correct
     */
    private addCorrectAnswer(answer: string) {
        this.userAnswers.push(answer);
    }

    /**
     * Removes given answer from correct answers
     * @param answer user answer which should be deleted
     */
    private removeCorrectAnswer(answer: string) {
        const indexToRemove = this.userAnswers.indexOf(answer);
        if (indexToRemove !== -1) {
            this.userAnswers.splice(indexToRemove, 1);
        }
    }
}
