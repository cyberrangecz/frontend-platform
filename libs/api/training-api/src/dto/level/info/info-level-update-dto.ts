import {AbstractLevelDTO} from '../abstract-level-dto';

/**
 * Info Level to update.
 */
export interface InfoLevelUpdateDTO {
    id?: number;
    title?: string;
    level_type?: AbstractLevelDTO.LevelTypeEnum;
    content?: string;
}

export class InfoLevelUpdateDTOClass implements InfoLevelUpdateDTO {
    id: number;
    title: string;
    level_type: AbstractLevelDTO.LevelTypeEnum = 'INFO_LEVEL';
    content: string;
}
