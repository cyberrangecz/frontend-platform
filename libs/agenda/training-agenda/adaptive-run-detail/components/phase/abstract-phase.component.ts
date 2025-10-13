import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {AbstractPhaseTypeEnum, Phase} from '@crczp/training-model';
import {InfoPhaseComponent} from "./info-phase/info-phase.component";
import {AccessPhaseComponent} from "./sandbox-interaction-phase/access-phase/access-phase.component";
import {TrainingPhaseComponent} from "./sandbox-interaction-phase/training-phase/training-phase.component";
import {QuestionnairePhaseComponent} from "./questionnaire-phase/questionnaire-phase.component";
import {TrainingTimerComponent} from "./training-timer/training-timer.component";
import {MatTooltip} from "@angular/material/tooltip";

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
        InfoPhaseComponent,
        AccessPhaseComponent,
        TrainingPhaseComponent,
        QuestionnairePhaseComponent,
        TrainingTimerComponent,
        MatTooltip
    ]
})
export class AbstractPhaseComponent {
    @Input() phase: Phase;
    @Input() isLast: boolean;
    @Input() isPhaseAnswered: boolean;
    @Input() isBacktracked: boolean;
    @Input() isLoading = false;
    @Input() sandboxInstanceId: string;
    @Input() sandboxDefinitionId: number;
    @Input() localEnvironment: boolean;
    @Input() startTime: Date;

    @Input() isStepperDisplayed!: boolean;
    @Output() next: EventEmitter<void> = new EventEmitter();
    phaseTypes = AbstractPhaseTypeEnum;

    onNext(): void {
        this.next.emit();
    }
}
