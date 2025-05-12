import { TimelineLevelDataDTO } from './timeline-level-data-dto';

export class TimelinePlayerDataDTO {
    id: number;
    name: string;
    picture: string;
    avatar_color: string;
    training_run_id: number;
    training_time: number;
    training_score: number;
    assessment_score: number;
    levels: TimelineLevelDataDTO[];
}
