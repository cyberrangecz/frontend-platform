import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AbstractPhaseTypeEnum, Phase} from '@crczp/training-model';
import {InfoPhaseDetailComponent} from "./info/info-phase-detail.component";
import {AccessPhaseDetailComponent} from "./access/access-phase-detail.component";
import {TrainingPhaseDetailComponent} from "./training/training-phase-detail.component";
import {QuestionnairePhaseDetailComponent} from "./questionnaire/questionnaire-phase-detail.component";

@Component({
    selector: 'crczp-phase-detail',
    templateUrl: './abstract-phase-detail.component.html',
    styleUrls: ['./abstract-phase-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        InfoPhaseDetailComponent,
        AccessPhaseDetailComponent,
        TrainingPhaseDetailComponent,
        QuestionnairePhaseDetailComponent
    ]
})
export class AbstractPhaseDetailComponent {
    @Input() phase: Phase;

    readonly AbstractPhaseTypeEnum = AbstractPhaseTypeEnum;
}
