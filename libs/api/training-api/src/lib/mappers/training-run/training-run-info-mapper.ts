import { TrainingRunInfoDTO } from '../../dto/training-run/training-run-info-dto';
import { TrainingRunInfo } from '@crczp/training-model';

/**
 * @dynamic
 */
export class TrainingRunInfoMapper {
    static fromDTOs(dtos: TrainingRunInfoDTO[]): TrainingRunInfo[] {
        return dtos.map((dto) => TrainingRunInfoMapper.fromDTO(dto));
    }

    static fromDTO(dto: TrainingRunInfoDTO): TrainingRunInfo {
        const result = new TrainingRunInfo();
        result.levelId = dto.level_id;
        result.levelOrder = dto.level_order;
        result.levelTitle = dto.level_title;
        result.correctAnswer = dto.correct_answer;
        result.variableName = dto.variable_name;
        return result;
    }
}
