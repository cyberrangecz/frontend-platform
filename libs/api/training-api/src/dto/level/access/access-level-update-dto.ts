import {AbstractLevelDTOLevelTypeEnum} from '../abstract-level-dto';

export interface AccessLevelUpdateDTO {
    id?: number;
    title?: string;
    passkey?: string;
    cloud_content?: string;
    local_content?: string;
    estimated_duration?: number;
    level_type: AbstractLevelDTOLevelTypeEnum;
}

export class AccessLevelUpdateDTOClass implements AccessLevelUpdateDTO {
    id?: number;
    title: string;
    passkey: string;
    cloud_content: string;
    local_content: string;
    estimated_duration: number;
    level_type: AbstractLevelDTOLevelTypeEnum = 'ACCESS_LEVEL';
}
