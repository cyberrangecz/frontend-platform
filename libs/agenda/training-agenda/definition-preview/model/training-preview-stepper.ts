import { SentinelStepper, StepStateEnum } from '@sentinel/components/stepper';
import { LevelStepperAdapter } from '@crczp/training-agenda/internal';

/**
 * Training preview levels adapter to stepper component
 */
export class TrainingPreviewStepper implements SentinelStepper<LevelStepperAdapter> {
    activeLevelIndex: number;
    items: LevelStepperAdapter[];

    constructor(levels: LevelStepperAdapter[], activeLevelIndex: number) {
        this.items = levels;
        this.activeLevelIndex = activeLevelIndex;
        this.onActiveLevelUpdated(this.activeLevelIndex);
    }

    onActiveLevelUpdated(activeLevelIndex: number): void {
        this.items[this.activeLevelIndex].state = StepStateEnum.SELECTABLE;
        this.activeLevelIndex = activeLevelIndex;
        const current = this.items[activeLevelIndex];
        if (current) {
            current.state = StepStateEnum.ACTIVE;
        }
    }
}
