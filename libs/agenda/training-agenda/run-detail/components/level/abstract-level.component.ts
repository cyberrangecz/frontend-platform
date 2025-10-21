import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractLevelTypeEnum, Level } from '@crczp/training-model';
import { AssessmentLevelComponent } from './assessment-level/assessment-level.component';
import { TrainingTimerComponent } from './training-timer/training-timer.component';
import { TrainingLevelComponent } from './sandbox-interaction-level/training-level/training-level.component';
import { InfoLevelComponent } from './info-level/info-level.component';
import { AccessLevelComponent } from './sandbox-interaction-level/access-level/access-level.component';
import { MatTooltip } from '@angular/material/tooltip';

/**
 * Component to display one level in a training run. Serves mainly as a wrapper which determines the type of the training
 * and displays child component accordingly
 */
@Component({
    selector: 'crczp-abstract-level',
    templateUrl: './abstract-level.component.html',
    styleUrls: ['./abstract-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AssessmentLevelComponent,
        TrainingTimerComponent,
        TrainingLevelComponent,
        InfoLevelComponent,
        AccessLevelComponent,
        MatTooltip,
    ],
})
export class AbstractLevelComponent {
    @Input() level: Level;
    @Input() startTime: Date;
    @Input() isLast: boolean;
    @Input() isLevelAnswered: boolean;
    @Input() isBacktracked: boolean;
    @Input() isStepperDisplayed: boolean;
    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;
    @Input() localEnvironment: boolean;

    @Output() next: EventEmitter<void> = new EventEmitter();
    levelTypes = AbstractLevelTypeEnum;

    onNext(): void {
        this.next.emit();
    }
}
