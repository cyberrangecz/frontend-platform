import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { QuestionnairePhaseTaskVisuazlization } from '@crczp/visualization-model';


@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'crczp-questionnaire-task-preview',
    templateUrl: './questionnaire-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionnaireTaskPreviewComponent {
    @Input() task?: QuestionnairePhaseTaskVisuazlization;
}
