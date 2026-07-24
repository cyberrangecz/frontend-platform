import { AbstractLevelTypeEnum } from '@crczp/training-model';

/**
 * Converts the backend `level_type` discriminator value to the {@link AbstractLevelTypeEnum} model value.
 *
 * @param levelType - level type received from the API (e.g. `'INFO_LEVEL'`)
 * @returns matching {@link AbstractLevelTypeEnum} value
 * @throws when an unknown level type is received
 */
export function levelTypeFromDTO(levelType: string): AbstractLevelTypeEnum {
    switch (levelType) {
        case 'INFO_LEVEL':       return AbstractLevelTypeEnum.Info;
        case 'ACCESS_LEVEL':     return AbstractLevelTypeEnum.Access;
        case 'TRAINING_LEVEL':   return AbstractLevelTypeEnum.Training;
        case 'ASSESSMENT_LEVEL': return AbstractLevelTypeEnum.Assessment;
        default:
            throw new Error(`Unknown level type: ${levelType}`);
    }
}
