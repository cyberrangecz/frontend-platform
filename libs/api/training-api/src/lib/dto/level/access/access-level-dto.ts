import {AbstractLevelDTO} from '../abstract-level-dto';

export interface AccessLevelDTO extends AbstractLevelDTO {
    passkey: string;
    content?: string;
    cloud_content: string;
    local_content: string;
}
