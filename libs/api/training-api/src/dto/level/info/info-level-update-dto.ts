import {AbstractLevelDTOLevelTypeEnum} from '../abstract-level-dto';

/**
 * Info Level to write.
 */
export interface InfoLevelUpdateDTO {
    id?: number;
    title?: string;
    level_type?: AbstractLevelDTOLevelTypeEnum;
    estimated_duration?: number;
    content?: string;
}

export class InfoLevelUpdateDTOClass implements InfoLevelUpdateDTO {
    id?: number;
    title: string;
    level_type: AbstractLevelDTOLevelTypeEnum = 'INFO_LEVEL';
    estimated_duration: number;
    content: string;
}
