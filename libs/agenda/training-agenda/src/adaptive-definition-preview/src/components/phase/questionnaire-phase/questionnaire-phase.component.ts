import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { QuestionAnswer, QuestionnairePhase, QuestionTypeEnum } from '@crczp/training-model';

@Component({
    selector: 'crczp-questionnaire-phase',
    templateUrl: './questionnaire-phase.component.html',
    styleUrls: ['./questionnaire-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionnairePhaseComponent {
    @Input() phase: QuestionnairePhase;

    isSubmitted = false;
    isLoading = false;
    questionAnswers: QuestionAnswer[] = [];
    questionTypes = QuestionTypeEnum;
}
