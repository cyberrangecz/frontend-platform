import { UserRefDTO } from '@crczp/training-api';
import { TraineeProgressDTO } from '../dtos';
import { ProgressTraineeInfo } from '@crczp/visualization-model';

export class ProgressTraineeInfoMapper {
    static fromDTOs(dtos: UserRefDTO[], progressTraineesDTOs: TraineeProgressDTO[]): ProgressTraineeInfo[] {
        return dtos.map((dto, index) => ProgressTraineeInfoMapper.fromDTO(dto, progressTraineesDTOs[index], index));
    }

    static fromDTO(dto: UserRefDTO, progressTraineeDTO: TraineeProgressDTO, index: number): ProgressTraineeInfo {
        const result = new ProgressTraineeInfo();
        result.teamIndex = index;
        result.name = dto.given_name + ' ' + dto.family_name;
        result.picture = dto.picture;
        result.userRefId = dto.user_ref_id;
        result.trainingRunId = progressTraineeDTO ? progressTraineeDTO.training_run_id : null;
        return result;
    }
}
