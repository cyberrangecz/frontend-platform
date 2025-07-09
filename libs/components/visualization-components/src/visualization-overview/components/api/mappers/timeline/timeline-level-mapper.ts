import {BasicLevelInfoDTO, TimelineLevelDataDTO} from '../../dto/timeline/timeline-level-data-dto';
import {BasicLevelInfo, TimelineLevel} from '../../../model/timeline/timeline-level';
import {TrainingLevelMapper} from './training-level-mapper';
import {TrainingLevelDto} from '../../dto/timeline/training-level-dto';
import {AssessmentLevelMapper} from './assessment-level-mapper';
import {AssessmentLevelDTO} from '../../dto/timeline/assessment-level-dto';
import {InfoLevel} from '../../../model/timeline/info-level';
import {EventMapper} from './event-mapper';
import {AccessLevel} from '../../../model/timeline/access-level';
import TimelineLevelTypeEnum = BasicLevelInfo.TimelineLevelTypeEnum;

/**
 * @dynamic
 */
export class TimelineLevelMapper {
    static fromDTOs(dtos: TimelineLevelDataDTO[]): TimelineLevel[] {
        return dtos.map((dto) => TimelineLevelMapper.fromDTO(dto));
    }

    static fromDTO(dto: TimelineLevelDataDTO): TimelineLevel {
        let level: TimelineLevel;
        switch (dto.level_type) {
            case BasicLevelInfoDTO.TimelineLevelTypeEnum.TRAINING: {
                level = TrainingLevelMapper.fromDTO(dto as TrainingLevelDto);
                level.events = EventMapper.fromDTOs(dto.events, dto.order, dto.level_type);
                level.levelType = TimelineLevelTypeEnum.TRAINING;
                break;
            }
            case BasicLevelInfoDTO.TimelineLevelTypeEnum.INFO: {
                level = new InfoLevel();
                level.events = EventMapper.fromDTOs(dto.events, dto.order, dto.level_type);
                level.levelType = TimelineLevelTypeEnum.INFO;
                break;
            }
            case BasicLevelInfoDTO.TimelineLevelTypeEnum.ASSESSMENT: {
                level = AssessmentLevelMapper.fromDTO(dto as AssessmentLevelDTO);
                level.events = EventMapper.fromDTOs(dto.events, dto.order, dto.level_type);
                level.levelType = TimelineLevelTypeEnum.ASSESSMENT;
                break;
            }
            case BasicLevelInfoDTO.TimelineLevelTypeEnum.ACCESS: {
                level = new AccessLevel();
                level.events = EventMapper.fromDTOs(dto.events, dto.order, dto.level_type);
                level.levelType = TimelineLevelTypeEnum.ACCESS;
                break;
            }
            default: {
                throw new Error(`Unsupported timeline level type: ${dto.level_type}`);
            }
        }
        level.id = dto.id;
        level.order = dto.order;
        level.startTime = dto.start_time / 1000;

        return level;
    }
}
