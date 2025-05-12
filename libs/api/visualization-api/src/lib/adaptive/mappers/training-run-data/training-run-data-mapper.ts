
import { TraineeMapper } from './trainee/trainee-mapper';
import { TrainingRunPathMapper } from './training-run-path-mapper';
import { TrainingRunDataDTO } from '../../dto/run-visualization-dto';
import { AdaptiveRunVisualization } from '@crczp/visualization-model';

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
        result.trainee = TraineeMapper.fromDTO(dto.trainee);
        result.trainingRunPathNodes = TrainingRunPathMapper.fromDTOs(dto.training_run_path_nodes);
        result.localEnvironment = dto.local_environment;
        return result;
    }
}
