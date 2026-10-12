import {AbstractLevelDTOLevelTypeEnum} from '../abstract-level-dto';

export interface AccessLevelUpdateDTO {
    id: number;
    passkey?: string;
    cloud_content?: string;
    local_content?: string;
    level_type: AbstractLevelDTOLevelTypeEnum;
    order: number;
}

export class AccessLevelUpdateDTOClass implements AccessLevelUpdateDTO {
    cloud_content: string;
    local_content: string;
    passkey: string;
    id: number;
    level_type: AbstractLevelDTOLevelTypeEnum = 'ACCESS_LEVEL';
    title: string;
    order: number;
}
