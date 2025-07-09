import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {QuestionnairePhaseTask} from '../../../model/phase/questionnaire-phase/questionnaire-phase-task';
import {AbstractQuestionComponent} from "./abstract-question/abstract-question.component";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'crczp-questionnaire-task-preview',
    templateUrl: './questionnaire-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AbstractQuestionComponent
    ]
})
export class QuestionnaireTaskPreviewComponent {
    @Input() task?: QuestionnairePhaseTask;
}
