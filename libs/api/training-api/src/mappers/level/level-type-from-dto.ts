import { AbstractLevelTypeEnum } from '@crczp/training-model';

/**
 * Converts a DTO level type string literal to the {@link AbstractLevelTypeEnum} model value.
 *
 * @param type - snake_case type string received from the API (e.g. `'linear_info'`)
 * @returns matching {@link AbstractLevelTypeEnum} value
 * @throws when an unknown type is received
 */
export function levelTypeFromDTO(type: string): AbstractLevelTypeEnum {
    switch (type) {
        case 'linear_info':       return AbstractLevelTypeEnum.Info;
        case 'linear_access':     return AbstractLevelTypeEnum.Access;
        case 'linear_training':   return AbstractLevelTypeEnum.Training;
        case 'linear_assessment': return AbstractLevelTypeEnum.Assessment;
        default:
            throw new Error(`Unknown level type: ${type}`);
    }
}
