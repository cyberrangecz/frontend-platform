import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {AbstractPhaseTypeEnum, Phase} from '@crczp/training-model';
import {QuestionnairePhaseComponent} from "./questionnaire-phase/questionnaire-phase.component";
import {TrainingPhaseComponent} from "./training-phase/training-phase.component";
import {InfoPhaseComponent} from "./info-phase/info-phase.component";
import {AccessPhaseComponent} from "./access-phase/access-phase.component";

/**
 * Component to display one level in a training run. Serves mainly as a wrapper which determines the type of the training
 * and displays child component accordingly
 */
@Component({
    selector: 'crczp-abstract-phase',
    templateUrl: './abstract-phase.component.html',
    styleUrls: ['./abstract-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        QuestionnairePhaseComponent,
        TrainingPhaseComponent,
        InfoPhaseComponent,
        AccessPhaseComponent
    ]
})
export class AbstractPhaseComponent {
    @Input() phase: Phase;

    @Output() next: EventEmitter<void> = new EventEmitter();
    phaseTypes = AbstractPhaseTypeEnum;

    onNext(): void {
        this.next.emit();
    }
}
