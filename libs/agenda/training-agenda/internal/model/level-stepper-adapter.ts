import { Level, Phase } from '@crczp/training-model';
import { StepItem, StepStateEnum } from '@sentinel/components/stepper';

export class LevelStepperAdapter implements StepItem {
    id: number;
    title: string;
    level: Level | Phase;
    icon: string;
    state: StepStateEnum;

    constructor(level: Level | Phase) {
        this.id = level.id;
        this.title = level.title;
        this.level = level;
        this.state = StepStateEnum.SELECTABLE;
        this.icon = level.getIcon();
    }
}
