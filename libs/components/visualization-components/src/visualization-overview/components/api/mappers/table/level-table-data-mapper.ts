import {LevelTableDataDTO} from '../../dto/table/level-table-data-dto';
import {LevelTableData} from '../../../model/table/level-table-data';
import {BasicLevelInfoDTO} from '../../dto/clustering/level-dto';
import {LevelTypeEnum} from '../../../model/clustering/enums/level-type.enum';

/**
 * @dynamic
 */
export class LevelTableDataMapper {
    static fromDTOs(dtos: LevelTableDataDTO[]): LevelTableData[] {
        return dtos.map((dto) => LevelTableDataMapper.fromDTO(dto));
    }

    private static fromDTO(dto: LevelTableDataDTO): LevelTableData {
        const result: LevelTableData = new LevelTableData();
        result.id = dto.id;
        result.order = dto.order;
        result.levelType = LevelTableDataMapper.levelTypeFromDTO(dto.level_type);
        result.participantLevelScore = dto.participant_level_score;
        result.hintsTaken = dto.hints_taken;
        result.wrongAnswers = dto.wrong_answers;

        return result;
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
                console.error(
                    `Attribute "level_type" of TableDTO with value: ${levelTypeDTO} does not match any of the Level types`,
                );
                return undefined;
            }
        }
    }
}
