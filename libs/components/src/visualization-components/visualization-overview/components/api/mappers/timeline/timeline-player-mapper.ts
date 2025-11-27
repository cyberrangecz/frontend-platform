import {TimelinePlayerDataDTO} from '../../dto/timeline/timeline-player-data-dto';
import {TimelinePlayer} from '../../../model/timeline/timeline-player';
import {TimelineLevelMapper} from './timeline-level-mapper';

/**
 * @dynamic
 */
export class TimelinePlayerMapper {
    static fromDTOs(dtos: TimelinePlayerDataDTO[]): TimelinePlayer[] {
        return dtos.map((dto) => TimelinePlayerMapper.fromDTO(dto));
    }

    private static fromDTO(dto: TimelinePlayerDataDTO): TimelinePlayer {
        const result = new TimelinePlayer();
        result.id = dto.id;
        if (dto.name) {
            result.name = dto.name;
        } else {
            result.name = 'Unknown';
        }
        result.picture = dto.picture;
        result.avatarColor = dto.avatar_color;
        result.trainingRunId = dto.training_run_id;
        result.trainingTime = dto.training_time / 1000;
        result.trainingScore = dto.training_score;
        result.assessmentScore = dto.assessment_score;
        result.levels = TimelineLevelMapper.fromDTOs(dto.levels);
        return result;
    }
}
