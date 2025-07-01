import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TrainingLevel } from '@crczp/training-model';

@Component({
    selector: 'crczp-training-level-detail',
    templateUrl: './training-level-detail.component.html',
    styleUrls: ['./training-level-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingLevelDetailComponent {
    @Input() level: TrainingLevel;

    getMitreTechniques(): string {
        return this.level.mitreTechniques.map((technique) => technique.techniqueKey).toString();
    }
}
