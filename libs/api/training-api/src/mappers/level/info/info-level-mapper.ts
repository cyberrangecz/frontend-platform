import {AbstractLevelTypeEnum, InfoLevel} from '@crczp/training-model';
import {InfoLevelDTO} from '../../../dto/level/info/info-level-dto';
import {InfoLevelUpdateDTO, InfoLevelUpdateDTOClass} from '../../../dto/level/info/info-level-update-dto';

export class InfoLevelMapper {
    static fromDTO(dto: InfoLevelDTO): InfoLevel {
        const result = new InfoLevel();
        result.type = AbstractLevelTypeEnum.Info;
        result.content = dto.content;
        return result;
    }

    static toUpdateDTO(level: InfoLevel): InfoLevelUpdateDTO {
        const result = new InfoLevelUpdateDTOClass();
        result.id = level.id;
        result.title = level.title;
        result.content = level.content;
        return result;
    }
}
