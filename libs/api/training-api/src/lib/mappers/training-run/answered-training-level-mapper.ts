import {
    AbstractLevelTypeEnum,
    AccessLevel,
    AssessmentLevel,
    InfoLevel,
    Level,
    TrainingLevel,
} from '@crczp/training-model';
import { AbstractLevelDTO } from '../../dto/level/abstract-level-dto';
import { AssessmentLevelDTO } from '../../dto/level/assessment/assessment-level-dto';
import { BasicLevelInfoDTO } from '../../dto/level/basic-level-info-dto';
import { TrainingLevelDto } from '../../dto/level/training/training-level-dto';
import { InfoLevelDTO } from '../../dto/level/info/info-level-dto';
import { AccessLevelDTO } from '../../dto/level/access/access-level-dto';
import { TrainingLevelMapper } from '../level/training/training-level-mapper';
import { InfoLevelMapper } from '../level/info/info-level-mapper';
import { AccessLevelMapper } from '../level/access/access-level-mapper';
import { AnsweredLevelMapper } from './training-run-levels/answered-level-mapper';
import { AnsweredAssessmentLevelMapper } from './training-run-levels/assessment/answered-assessment-level-mapper';

/**
 * @dynamic
 */
export class TrainingRunLevelMapper {
    static fromDTO(dto: AbstractLevelDTO): Level {
        let level: Level;
        switch (dto.level_type) {
            case AbstractLevelDTO.LevelTypeEnum.TRAINING: {
                level = TrainingLevelMapper.fromDTO(dto as TrainingLevelDto);
                break;
            }
            case AbstractLevelDTO.LevelTypeEnum.INFO: {
                level = InfoLevelMapper.fromDTO(dto as InfoLevelDTO);
                break;
            }
            case AbstractLevelDTO.LevelTypeEnum.ASSESSMENT: {
                level = AnsweredAssessmentLevelMapper.fromDTO(dto as AssessmentLevelDTO);
                break;
            }
            case AbstractLevelDTO.LevelTypeEnum.ACCESS: {
                level = AccessLevelMapper.fromDTO(dto as AccessLevelDTO);
                break;
            }
        }

        level.id = dto.id;
        level.title = dto.title;
        level.order = dto.order;
        level.estimatedDuration = dto.estimated_duration;
        level.minimalPossibleSolveTime = dto.minimal_possible_solve_time;
        level.maxScore = dto.max_score;
        return level;
    }

    static fromDTOs(dtos: AbstractLevelDTO[]): Level[] {
        return dtos.map((dto) => AnsweredLevelMapper.fromDTO(dto)).sort((a, b) => a.order - b.order);
    }

    static fromBasicDTO(dto: BasicLevelInfoDTO): Level {
        let level: Level;
        switch (dto.level_type) {
            case BasicLevelInfoDTO.LevelTypeEnum.TRAINING: {
                level = new TrainingLevel();
                level.type = AbstractLevelTypeEnum.Training;
                break;
            }
            case BasicLevelInfoDTO.LevelTypeEnum.INFO: {
                level = new InfoLevel();
                level.type = AbstractLevelTypeEnum.Info;
                break;
            }
            case BasicLevelInfoDTO.LevelTypeEnum.ASSESSMENT: {
                level = new AssessmentLevel();
                level.type = AbstractLevelTypeEnum.Assessment;
                break;
            }
            case BasicLevelInfoDTO.LevelTypeEnum.ACCESS: {
                level = new AccessLevel();
                level.type = AbstractLevelTypeEnum.Access;
                break;
            }
        }

        level.id = dto.id;
        level.title = dto.title;
        level.order = dto.order;
        return level;
    }

    static fromBasicDTOs(dtos: BasicLevelInfoDTO[]): Level[] {
        return dtos.map((dto) => this.fromBasicDTO(dto));
    }
}
