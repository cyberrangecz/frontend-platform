import {
    AbstractLevelTypeEnum,
    AbstractPhaseTypeEnum,
} from '@crczp/training-model';

function levelTypeToIcon(
    levelType: AbstractLevelTypeEnum | AbstractPhaseTypeEnum,
): string {
    switch (levelType) {
        case AbstractLevelTypeEnum.Info:
        case AbstractPhaseTypeEnum.Info:
            return 'info';
        case AbstractLevelTypeEnum.Training:
        case AbstractPhaseTypeEnum.Training:
            return 'videogame_asset';
        case AbstractLevelTypeEnum.Access:
        case AbstractPhaseTypeEnum.Access:
            return 'settings';
        case AbstractLevelTypeEnum.Assessment:
            return 'assignment';
        case AbstractPhaseTypeEnum.Questionnaire:
            return 'quiz';
        default:
            return 'help';
    }
}

export const LevelTypeUtils = {
    levelTypeToIcon,
};
