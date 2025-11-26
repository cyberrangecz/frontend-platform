import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { QuestionnairePhaseTaskVisuazlization } from '@crczp/visualization-model';

@Component({
    selector: 'crczp-questionnaire-task-preview',
    templateUrl: './questionnaire-task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionnaireTaskPreviewComponent {
    @Input() task?: QuestionnairePhaseTaskVisuazlization;
}
