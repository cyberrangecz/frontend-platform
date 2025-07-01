import { StepperStateChange } from '@sentinel/components/stepper';

/**
 * Event representing change of position of a phases in phases stepper
 */
export class PhaseMoveEvent {
    stepperState: StepperStateChange;

    constructor(stepperStateChange: StepperStateChange) {
        this.stepperState = stepperStateChange;
    }
}
