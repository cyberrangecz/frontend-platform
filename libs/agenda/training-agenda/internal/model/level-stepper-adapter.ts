import { AbstractLevelTypeEnum, Level } from '@crczp/training-model';
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
        this.icon = this.getLevelIcon(level);
    }

    private getLevelIcon(level: Level): string {
        switch (level.type) {
            case AbstractLevelTypeEnum.Assessment:
                return 'assignment';
            case AbstractLevelTypeEnum.Training:
                return 'videogame_asset';
            case AbstractLevelTypeEnum.Access:
                return 'settings';
            case AbstractLevelTypeEnum.Info:
                return 'info';
            default: {
                this.icon = 'help';
            }
        }
    }
}
