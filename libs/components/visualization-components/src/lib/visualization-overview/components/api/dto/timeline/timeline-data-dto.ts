import { TimelinePlayerDataDTO } from './timeline-player-data-dto';

export class TimelineDataDTO {
    estimated_time: number;
    max_score_of_levels: number[];
    max_participant_time: number;
    average_time: number;
    player_data: TimelinePlayerDataDTO[];
}
