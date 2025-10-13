import { TrainingRunPathMapper } from './training-run-path-mapper';
import { TrainingRunDataDTO } from '../../dto/run-visualization-dto';
import { AdaptiveRunVisualization } from '@crczp/visualization-model';
import { UserMapper } from '@crczp/training-api';

/**
 * @dynamic
 */
export class TrainingRunDataMapper {
    static fromDTOs(dtos: TrainingRunDataDTO[]): AdaptiveRunVisualization[] {
        return dtos.map((dto) => TrainingRunDataMapper.fromDTO(dto));
    }

    static fromDTO(dto: TrainingRunDataDTO): AdaptiveRunVisualization {
        const result = new AdaptiveRunVisualization();
        result.trainingRunId = dto.training_run_id;
        result.trainee = UserMapper.fromDTO(dto.trainee);
        result.trainingRunPathNodes = TrainingRunPathMapper.fromDTOs(
            dto.training_run_path_nodes
        );
        result.localEnvironment = dto.local_environment;
        return result;
    }
}
