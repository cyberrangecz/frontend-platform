import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {AbstractPhaseTypeEnum, InfoPhase, Phase, QuestionnairePhase, TrainingPhase} from '@crczp/training-model';
import {InfoPhaseEditComponent} from "./info-phase/info-phase-edit.component";
import {TrainingPhaseEditComponent} from "./training-phase/training-phase-edit.component";
import {QuestionnairePhaseEditComponent} from "./questionnaire/questionnaire-phase-edit.component";

/**
 * Main component of phases edit. Resolves which component should be display based on phases type
 */
@Component({
    selector: 'crczp-simulator-phase-edit',
    templateUrl: './abstract-phase-edit.component.html',
    styleUrls: ['./abstract-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        InfoPhaseEditComponent,
        TrainingPhaseEditComponent,
        QuestionnairePhaseEditComponent
    ]
})
export class AbstractPhaseEditComponent {
    @Input() phase: Phase;
    @Input() presentTrainingPhases: TrainingPhase[];
    @Output() phaseChange: EventEmitter<TrainingPhase> = new EventEmitter();
    @Output() isPhaseValid: EventEmitter<boolean> = new EventEmitter();
    phaseTypes = AbstractPhaseTypeEnum;

    onPhaseChange(phase: TrainingPhase): void {
        this.phaseChange.emit(phase);
    }

    onValidityChange(event: boolean): void {
        this.isPhaseValid.emit(event);
    }

    asQuestionnairePhase = (phase: Phase) => phase as QuestionnairePhase;

    asTrainingPhase = (phase: Phase) => phase as TrainingPhase;

    asInfoPhase = (phase: Phase) => phase as InfoPhase;
}
