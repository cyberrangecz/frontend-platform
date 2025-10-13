import {Timeline} from '../../../model/timeline/timeline';
import {TimelineData} from '../../../model/timeline/timeline-data';
import {TimelinePlayerMapper} from './timeline-player-mapper';
import {TimelineDataDTO} from '../../dto/timeline/timeline-data-dto';

export class TimelineMapper {
    static fromDTO(dto: TimelineDataDTO): Timeline {
        const result = new Timeline();
        result.timeline = new TimelineData();
        result.timeline.averageTime = dto.average_time / 1000;
        result.timeline.estimatedTime = dto.estimated_time / 1000;
        result.timeline.maxScoreOfLevels = TimelineMapper.adjustLevelPoints(dto.max_score_of_levels);
        result.timeline.maxParticipantTime = dto.max_participant_time / 1000;
        result.timeline.playerData = TimelinePlayerMapper.fromDTOs(dto.player_data);
        return result;
    }

    /**
     * Computes tick values for Y score axis. Filters levels with zero gainable points
     * and creates array where element value equals to sum of it's predecessor. This way
     * maximum gainable score and tick values for Y axis are determined.
     * @param levelPoints array of max gainable points per level
     * @private
     */
    private static adjustLevelPoints(levelPoints: number[]): number[] {
        levelPoints = levelPoints.filter((tickValue) => tickValue !== 0);
        return levelPoints.map((elem, index) => levelPoints.slice(0, index + 1).reduce((a, b) => a + b));
    }
}
