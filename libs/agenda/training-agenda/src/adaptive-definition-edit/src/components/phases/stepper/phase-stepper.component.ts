import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SentinelStepper, StepperStateChange, StepStateEnum } from '@sentinel/components/stepper';
import { PhaseStepperAdapter } from '@crczp/training-agenda/internal';
import { PhaseMoveEvent } from '../../../model/events/phase-move-event';

/**
 * Stepper component for navigation between training-training-phase definition levels
 */
@Component({
    selector: 'crczp-phase-stepper',
    templateUrl: './phase-stepper.component.html',
    styleUrls: ['./phase-stepper.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaseStepperComponent implements OnChanges {
    @Input() phases: PhaseStepperAdapter[];
    @Input() movingInProgress: boolean;
    @Input() activeStep: number;

    @Output() activeStepChange: EventEmitter<number> = new EventEmitter();
    @Output() phaseMove: EventEmitter<PhaseMoveEvent> = new EventEmitter();
    @Output() initialPhases: EventEmitter<PhaseStepperAdapter[]> = new EventEmitter();

    phaseStepper: SentinelStepper<PhaseStepperAdapter> = { items: [] };

    private previousActiveStep = -1;

    constructor(public dialog: MatDialog) {}

    ngOnChanges(changes: SimpleChanges): void {
        if ('phases' in changes) {
            this.phaseStepper.items = this.phases;
        }
        this.changeSelectedStep(this.activeStep);
    }

    /**
     * Passes active step change event to parent component
     * @param activeStep index of active (selected) phases
     */
    activeStepChanged(activeStep: number): void {
        this.activeStepChange.emit(activeStep);
    }

    /**
     * Wraps stepper state change event to phases move event and emits it to parent component
     * @param event state of the stepper
     */
    swapPhases(event: StepperStateChange): void {
        this.phaseMove.emit(new PhaseMoveEvent(event));
    }

    private changeSelectedStep(index: number) {
        if (this.previousActiveStep >= 0 && this.previousActiveStep < this.phaseStepper.items.length) {
            this.phaseStepper.items[this.previousActiveStep].state = StepStateEnum.SELECTABLE;
        }
        this.phaseStepper.items[index].state = StepStateEnum.ACTIVE;
        this.previousActiveStep = this.activeStep;
    }
}
