import { ProgressLevelInfoMapper } from './progress-level-info-mapper';
import { TraineeProgressMapper } from './trainee-progress-mapper';
import { ProgressVisualizationApiData } from '@crczp/visualization-model';
import { ProgressVisualizationDataDTO } from '../dtos';

export class ProgressVisualizationDataMapper {
    static fromDTO(
        dto: ProgressVisualizationDataDTO,
    ): ProgressVisualizationApiData {
        const result = new ProgressVisualizationApiData();
        result.startTime = dto.start_time * 1000; // Convert to milliseconds
        result.estimatedEndTime = dto.estimated_end_time * 1000; // Convert to milliseconds
        result.endTime = dto.current_time * 1000; // Convert to milliseconds
        result.levels = ProgressLevelInfoMapper.fromDTOs(dto.levels);
        result.progress = TraineeProgressMapper.fromDTOs(dto.progress);
        return result;
    }
}
