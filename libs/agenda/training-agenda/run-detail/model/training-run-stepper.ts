import { SentinelStepper, StepStateEnum } from '@sentinel/components/stepper';
import { LevelStepperAdapter } from '@crczp/training-agenda/internal';
import { Level, Phase } from '@crczp/training-model';

/**
 * Training run levels adapter to stepper component
 */
export class TrainingRunStepper
    implements SentinelStepper<LevelStepperAdapter>
{
    activeLevelIndex: number;
    items: LevelStepperAdapter[];

    constructor(
        levels: (Level | Phase)[],
        activeLevelId: number,
        public selectable: boolean,
    ) {
        this.items = levels.map((level) => new LevelStepperAdapter(level));
        this.activeLevelIndex = this.items.findIndex(
            (level) => level.id === activeLevelId,
        );
        this.markCompletedLevels();
        this.markPendingLevels(this.items);
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
