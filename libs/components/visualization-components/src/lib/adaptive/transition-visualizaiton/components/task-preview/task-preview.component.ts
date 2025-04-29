import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import {
    AccessPhaseTask,
    InfoPhaseTask,
    QuestionnairePhaseTask,
    TransitionTask,
    TrainingPhaseTask
} from '@crczp/visualization-model';
import { AbstractPhaseTypeEnum } from '@crczp/training-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'crczp-task-preview',
    templateUrl: './task-preview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPreviewComponent {
    @Input() task?: TransitionTask;
    @Input() localEnvironment?: boolean;

    AbstractTaskTypeEnum = AbstractPhaseTypeEnum;

    taskTypeResolver(task: TransitionTask | undefined) {
        switch (true) {
            case task instanceof InfoPhaseTask:
                return AbstractPhaseTypeEnum.Info;
            case task instanceof TrainingPhaseTask:
                return AbstractPhaseTypeEnum.Training;
            case task instanceof QuestionnairePhaseTask:
                return AbstractPhaseTypeEnum.Questionnaire;
            case task instanceof AccessPhaseTask:
                return AbstractPhaseTypeEnum.Access;
            default:
                return '';
        }
    }
}
