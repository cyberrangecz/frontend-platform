import { Level } from '@crczp/training-model';
import { StepItem, StepStateEnum } from '@sentinel/components/stepper';

export class LevelStepperAdapter implements StepItem {
    id: number;
    title: string;
    level: Level;
    icon: string;
    state: StepStateEnum;

    constructor(level: Level) {
        this.id = level.id;
        this.title = level.title;
        this.level = level;
        this.state = StepStateEnum.SELECTABLE;
        this.icon = level.getIcon();
    }
}
