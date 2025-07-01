import { SentinelStepper, StepStateEnum } from '@sentinel/components/stepper';
import { PhaseStepperAdapter } from '@crczp/training-agenda/internal';

/**
 * Adaptive run phases adapter to stepper component
 */
export class AdaptiveRunStepper implements SentinelStepper<PhaseStepperAdapter> {
    activePhaseIndex: number;
    items: PhaseStepperAdapter[];

    constructor(phases: PhaseStepperAdapter[], activePhaseIndex: number) {
        this.items = phases;
        this.activePhaseIndex = activePhaseIndex;
        this.markCompletedPhases();
        this.markPendingPhases(phases);
    }

    onActivePhaseUpdated(activePhaseIndex: number): void {
        this.items[this.activePhaseIndex].state = StepStateEnum.SELECTABLE;
        this.activePhaseIndex = activePhaseIndex;
        this.markCompletedPhases();
        const current = this.items[activePhaseIndex];
        if (current) {
            current.state = StepStateEnum.ACTIVE;
        }
    }

    private markCompletedPhases() {
        for (let i = 0; i < this.activePhaseIndex; i++) {
            this.items[i].state = StepStateEnum.SELECTABLE;
        }
    }

    /**
     * Marks pending phases as pending
     */
    private markPendingPhases(phases: PhaseStepperAdapter[]) {
        for (let i = this.activePhaseIndex; i < phases.length; i++) {
            this.items[i].state = StepStateEnum.DISABLED;
        }
    }
}
