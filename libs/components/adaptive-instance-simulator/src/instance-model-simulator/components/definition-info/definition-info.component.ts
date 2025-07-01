import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import {AbstractPhaseTypeEnum, Phase, TrainingDefinition, TrainingPhase} from '@crczp/training-model';
import {PhaseStepperAdapter} from '../../model/adapters/phase-stepper-adapter';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {MatDivider} from "@angular/material/divider";
import {MatIcon} from "@angular/material/icon";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {MatCheckbox} from "@angular/material/checkbox";
import {NgForOf, NgIf} from "@angular/common";
import {AbstractPhaseEditComponent} from "./phase-edit/abstract-phase-edit.component";
import {PhaseStepperComponent} from "./stepper/phase-stepper.component";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-adaptive-instance-simulator-definition-info',
    templateUrl: './definition-info.component.html',
    styleUrls: ['./definition-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelContent,
        MatIcon,
        MatDivider,
        MatFormField,
        MatLabel,
        MatExpansionPanelDescription,
        MatInput,
        MatCheckbox,
        MatTooltip,
        NgIf,
        NgForOf,
        AbstractPhaseEditComponent,
        PhaseStepperComponent
    ]
})
export class DefinitionInfoComponent implements OnInit, OnChanges {
    @Input() definitionInfo: TrainingDefinition;
    @Output() phaseChange: EventEmitter<TrainingPhase> = new EventEmitter();
    @Output() isPhaseValid: EventEmitter<boolean> = new EventEmitter();

    activeStep: number;
    activePhase: Phase;
    trainingPhases: TrainingPhase[];
    stepperPhases: PhaseStepperAdapter[];

    ngOnInit(): void {
        this.activeStep = 0;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('definitionInfo' in changes && !changes['definitionInfo'].isFirstChange()) {
            const phases = this.definitionInfo.levels as Phase[];
            this.stepperPhases = this.definitionInfo.levels.map((phase) => new PhaseStepperAdapter(phase));
            this.activePhase = phases[this.activeStep];
            this.trainingPhases = phases.filter(
                (phase) => phase.type === AbstractPhaseTypeEnum.Training,
            ) as TrainingPhase[];
        }
    }

    /**
     * Calls service to set new active phases
     * @param phaseIndex index of new active phases
     */
    onActivePhaseChange(phaseIndex: number): void {
        this.activePhase = this.definitionInfo.levels[phaseIndex] as Phase;
    }

    onActivePhaseChanged(phase: TrainingPhase): void {
        this.phaseChange.emit(phase);
    }

    onPhaseValidChanged(event: boolean): void {
        this.isPhaseValid.emit(event);
    }
}
