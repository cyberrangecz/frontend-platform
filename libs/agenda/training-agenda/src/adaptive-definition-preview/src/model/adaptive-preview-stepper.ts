import { SentinelStepper, StepStateEnum } from '@sentinel/components/stepper';
import { PhaseStepperAdapter } from '@crczp/training-agenda/internal';

/**
 * Adaptive preview phases adapter to stepper component
 */
export class AdaptivePreviewStepper implements SentinelStepper<PhaseStepperAdapter> {
    activePhaseIndex: number;
    items: PhaseStepperAdapter[];

    constructor(phases: PhaseStepperAdapter[], activePhaseIndex: number) {
        this.items = phases;
        this.activePhaseIndex = activePhaseIndex;
        this.onActiveLevelUpdated(this.activePhaseIndex);
    }

    onActiveLevelUpdated(activePhaseIndex: number): void {
        this.items[this.activePhaseIndex].state = StepStateEnum.SELECTABLE;
        this.activePhaseIndex = activePhaseIndex;
        const current = this.items[activePhaseIndex];
        if (current) {
            current.state = StepStateEnum.ACTIVE;
        }
    }
}
