import { StepperStateChange } from '@sentinel/components/stepper';

/**
 * Event representing change of position of a level in level stepper
 */
export class LevelMoveEvent {
    stepperState: StepperStateChange;

    constructor(stepperStateChange: StepperStateChange) {
        this.stepperState = stepperStateChange;
    }
}
