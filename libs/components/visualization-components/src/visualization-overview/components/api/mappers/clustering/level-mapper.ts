import {BasicLevelInfoDTO, LevelDTO} from '../../dto/clustering/level-dto';
import {Level} from '../../../model/clustering/level';
import {LevelTypeEnum} from '../../../model/clustering/enums/level-type.enum';
import {PlayerLevelDataMapper} from './player-level-data-mapper';

/**
 * @dynamic
 */
export class LevelMapper {
    static fromDTOs(dtos: LevelDTO[]): Level[] {
        return dtos.map((dto) => LevelMapper.fromDTO(dto));
    }

    private static fromDTO(dto: LevelDTO): Level {
        const level: Level = new Level();
        level.id = dto.id;
        level.title = dto.title;
        level.order = dto.order;
        level.averageScore = dto.average_score;
        level.maxParticipantScore = dto.max_participant_score;
        level.maxAchievableScore = dto.max_achievable_score;
        level.estimatedTime = dto.estimated_time / 1000;
        level.averageTime = dto.average_time / 1000;
        level.maxParticipantTime = dto.max_participant_time / 1000;
        level.levelType = LevelMapper.levelTypeFromDTO(dto.level_type);
        level.playerLevelData = PlayerLevelDataMapper.fromDTOs(dto.player_data);

        return level;
    }

    private static levelTypeFromDTO(levelTypeDTO: BasicLevelInfoDTO.LevelTypeEnum): LevelTypeEnum {
        switch (levelTypeDTO) {
            case BasicLevelInfoDTO.LevelTypeEnum.ASSESSMENT:
                return LevelTypeEnum.AssessmentLevel;
            case BasicLevelInfoDTO.LevelTypeEnum.TRAINING:
                return LevelTypeEnum.TrainingLevel;
            case BasicLevelInfoDTO.LevelTypeEnum.INFO:
                return LevelTypeEnum.InfoLevel;
            case BasicLevelInfoDTO.LevelTypeEnum.ACCESS:
                return LevelTypeEnum.InfoLevel;
            default: {
                throw new Error(
                    `Attribute "level_type" of ClusteringVisualizationResourceDTO with value:` +
                    `${levelTypeDTO} does not match any of the Level types`,
                );
            }
        }
    }
}
