import { AbstractLevelTypeEnum } from '@crczp/training-model';

function levelTypeToIcon(levelType: AbstractLevelTypeEnum): string {
    switch (levelType) {
        case AbstractLevelTypeEnum.Info:
            return 'info';
        case AbstractLevelTypeEnum.Training:
            return 'videogame_asset';
        case AbstractLevelTypeEnum.Access:
            return 'settings';
        case AbstractLevelTypeEnum.Assessment:
            return 'assignment';
        default:
            return 'help';
    }
}

export const LevelTypeUtils = {
    levelTypeToIcon,
};
