import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {AbstractLevelTypeEnum, Level} from '@crczp/training-model';
import {AssessmentLevelComponent} from "./assessment-level/assessment-level.component";
import {TrainingLevelComponent} from "./training-level/training-level.component";
import {InfoLevelComponent} from "./info-level/info-level.component";
import {AccessLevelComponent} from "./access-level/access-level.component";

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
        TrainingLevelComponent,
        InfoLevelComponent,
        AccessLevelComponent
    ]
})
export class AbstractLevelComponent {
    @Input() level: Level;
    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Input() sandboxInstanceId: number;
    @Input() sandboxDefinitionId: number;
    @Input() localEnvironment: boolean;

    @Output() next: EventEmitter<void> = new EventEmitter();
    levelTypes = AbstractLevelTypeEnum;

    onNext(): void {
        this.next.emit();
    }
}
