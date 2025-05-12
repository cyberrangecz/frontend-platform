import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AdaptiveQuestion, QuestionTypeEnum } from '@crczp/training-model';

/**
 * Main hint edit component. Contains stepper to navigate through existing hints and controls to create new hints
 */
@Component({
    selector: 'crczp-related-questions',
    templateUrl: './related-questions.component.html',
    styleUrls: ['./related-questions.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedQuestionsComponent {
    @Input() relatedQuestions: AdaptiveQuestion[];
    questionTypes = QuestionTypeEnum;
}
