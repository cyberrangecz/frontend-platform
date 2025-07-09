import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AbstractLevelTypeEnum, Level} from '@crczp/training-model';
import {TrainingLevelDetailComponent} from "./training/training-level-detail.component";
import {InfoLevelDetailComponent} from "./info/info-level-detail.component";
import {AccessLevelDetailComponent} from "./access/access-level-detail.component";
import {AssessmentLevelDetailComponent} from "./assessment/assessment-level-detail.component";

@Component({
    selector: 'crczp-level-detail',
    templateUrl: './abstract-level-detail.component.html',
    styleUrls: ['./abstract-level-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TrainingLevelDetailComponent,
        InfoLevelDetailComponent,
        AccessLevelDetailComponent,
        AssessmentLevelDetailComponent
    ]
})
export class AbstractLevelDetailComponent {
    @Input() level: Level;

    levelTypes = AbstractLevelTypeEnum;
}
