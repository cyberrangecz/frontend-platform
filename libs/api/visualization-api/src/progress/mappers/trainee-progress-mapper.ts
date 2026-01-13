import { ProgressLevelVisualizationMapper } from './progress-level-visualization-mapper';
import { TraineeProgressDTO } from '../dtos';
import { TraineeProgressData } from '@crczp/visualization-model';

export class TraineeProgressMapper {
    static fromDTOs(dtos: TraineeProgressDTO[]): TraineeProgressData[] {
        return dtos.map((dto) => TraineeProgressMapper.fromDTO(dto));
    }

    static fromDTO(dto: TraineeProgressDTO): TraineeProgressData {
        const result = new TraineeProgressData();
        result.id = dto.id;
        result.name = dto.name;
        result.picture = dto.picture;
        result.trainingRunId = dto.training_run_id;
        result.levels = ProgressLevelVisualizationMapper.fromDTOs(dto.levels);
        return result;
    }
}
