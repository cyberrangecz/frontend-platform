import {AbstractLevelDTOLevelTypeEnum} from '../abstract-level-dto';

/**
 * Info Level to update.
 */
export interface InfoLevelUpdateDTO {
    id?: number;
    title?: string;
    level_type?: AbstractLevelDTOLevelTypeEnum;
    content?: string;
}

export class InfoLevelUpdateDTOClass implements InfoLevelUpdateDTO {
    id: number;
    title: string;
    level_type: AbstractLevelDTOLevelTypeEnum = 'INFO_LEVEL';
    content: string;
}
