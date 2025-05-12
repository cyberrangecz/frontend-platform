import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MultipleChoiceQuestion } from '@crczp/training-model';

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
}
