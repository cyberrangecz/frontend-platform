import { SentinelStepper, StepStateEnum } from '@sentinel/components/stepper';
import { LevelStepperAdapter } from '@crczp/training-agenda/internal';

/**
 * Training run levels adapter to stepper component
 */
export class TrainingRunStepper implements SentinelStepper<LevelStepperAdapter> {
    activeLevelIndex: number;
    items: LevelStepperAdapter[];

    constructor(levels: LevelStepperAdapter[], activeLevelIndex: number) {
        this.items = levels;
        this.activeLevelIndex = activeLevelIndex;
        this.markCompletedLevels();
        this.markPendingLevels(levels);
    }

    onActiveLevelUpdated(activeLevelIndex: number): void {
        this.items[this.activeLevelIndex].state = StepStateEnum.SELECTABLE;
        this.activeLevelIndex = activeLevelIndex;
        this.markCompletedLevels();
        const current = this.items[activeLevelIndex];
        if (current) {
            current.state = StepStateEnum.ACTIVE;
        }
    }

    /**
     * Marks already completed levels as done
     */
    private markCompletedLevels() {
        for (let i = 0; i < this.activeLevelIndex; i++) {
            this.items[i].state = StepStateEnum.SELECTABLE;
        }
    }

    /**
     * Marks pending levels as pending
     */
    private markPendingLevels(levels: LevelStepperAdapter[]) {
        for (let i = this.activeLevelIndex; i < levels.length; i++) {
            this.items[i].state = StepStateEnum.DISABLED;
        }
    }
}
