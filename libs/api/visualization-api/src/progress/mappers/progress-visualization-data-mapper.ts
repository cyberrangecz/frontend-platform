import {ProgressLevelInfoMapper} from './progress-level-info-mapper';
import {TraineeProgressMapper} from './trainee-progress-mapper';
import {ProgressVisualizationData} from '@crczp/visualization-model';
import {ProgressVisualizationDataDTO} from '../dtos';
import {ProgressTraineeInfoMapper} from './progress-trainee-info-mapper';


export class ProgressVisualizationDataMapper {
    static fromDTO(dto: ProgressVisualizationDataDTO): ProgressVisualizationData {
        const result = new ProgressVisualizationData();
        result.startTime = dto.start_time;
        result.estimatedEndTime = dto.estimated_end_time;
        result.currentTime = dto.current_time;
        result.levels = ProgressLevelInfoMapper.fromDTOs(dto.levels);
        result.trainees = ProgressTraineeInfoMapper.fromDTOs(dto.players, dto.player_progress);
        result.traineeProgress = TraineeProgressMapper.fromDTOs(dto.player_progress);
        return result;
    }
}
