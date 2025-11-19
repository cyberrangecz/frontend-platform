import { Level } from '../level/level';
import { Phase } from '../phase/phase';

/**
 * Class containing info about accessed training run
 */
export class AccessTrainingRunInfo {
    trainingRunId!: number;
    sandboxInstanceId?: string;
    sandboxDefinitionId?: number;
    currentLevelId!: number;
    displayedLevelId: number;
    levels: Level[] | Phase[] = [];
    isStepperDisplayed!: boolean;
    isPreview!: boolean;
    startTime!: Date;
    localEnvironment!: boolean;
    backwardMode!: boolean;
    isLevelAnswered!: boolean;

    public get currentLevel(): Level | Phase {
        return this.levels.find((level) => level.id === this.currentLevelId);
    }

    public get displayedLevel(): Level | Phase {
        return this.levels.find((level) => level.id === this.displayedLevelId);
    }

    public get isBacktracked(): boolean {
        return this.displayedLevelId !== this.currentLevelId;
    }

    public get isLastLevelDisplayed(): boolean {
        return (
            this.displayedLevel.id === this.levels[this.levels.length - 1]?.id
        );
    }

    public get isLastLevel(): boolean {
        return this.currentLevel.id === this.levels[this.levels.length - 1]?.id;
    }

    public update(
        properties: Partial<AccessTrainingRunInfo>,
    ): AccessTrainingRunInfo {
        Object.assign(this, properties);
        return this;
    }
}
