import {AbstractLevelTypeEnum, AccessLevel} from '@crczp/training-model';
import {AccessLevelDTO} from '../../../dto/level/access/access-level-dto';
import {AccessLevelUpdateDTO, AccessLevelUpdateDTOClass} from '../../../dto/level/access/access-level-update-dto';

export class AccessLevelMapper {
    static fromDTO(dto: AccessLevelDTO): AccessLevel {
        const result = new AccessLevel();
        result.type = AbstractLevelTypeEnum.Access;
        result.passkey = dto.passkey;
        result.cloudContent = dto.cloud_content;
        result.localContent = dto.local_content;
        return result;
    }

    static toUpdateDTO(level: AccessLevel): AccessLevelUpdateDTO {
        const result = new AccessLevelUpdateDTOClass();
        result.id = level.id;
        result.title = level.title;
        result.passkey = level.passkey;
        result.cloud_content = level.cloudContent;
        result.local_content = level.localContent;
        return result;
    }
}
