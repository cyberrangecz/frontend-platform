import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import {
    AbstractLevelTypeEnum,
    Level,
    MitreTechnique,
} from '@crczp/training-model';
import { AccessLevelEditComponent } from './access/access-level-edit.component';
import { AssessmentLevelEditComponent } from './assessment/assessment-level-edit.component';
import { InfoLevelEditComponent } from './info/info-level-edit.component';
import { TrainingLevelEditComponent } from './training/training-level-edit.component';

/**
 * Main component of level edit. Resolves which component should be display based on level type
 */
@Component({
    selector: 'crczp-level-edit',
    templateUrl: './abstract-level-edit.component.html',
    styleUrls: ['./abstract-level-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AssessmentLevelEditComponent,
        InfoLevelEditComponent,
        AccessLevelEditComponent,
        TrainingLevelEditComponent,
    ],
})
export class AbstractLevelEditComponent {
    @Input() level: Level;
    @Input() mitreTechniquesList: MitreTechnique[];
    @Output() levelChange: EventEmitter<Level> = new EventEmitter();
    levelTypes = AbstractLevelTypeEnum;

    /**
     * Passes emitted event to the parent component
     * @param level changed level
     */
    onLevelChange(level: Level): void {
        this.levelChange.emit(level);
    }
}
