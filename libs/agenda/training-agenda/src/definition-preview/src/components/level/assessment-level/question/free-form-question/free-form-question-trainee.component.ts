import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FreeFormQuestion } from '@crczp/training-model';

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
export class FreeFormQuestionTraineeComponent {
    @Input() question: FreeFormQuestion;
    @Input() index: number;

    answer: string;
}
