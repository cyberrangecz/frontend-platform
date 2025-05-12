import { TimelineEventDTO } from './timeline-event-dto';
import { TimelineLevelDataDTO } from './timeline-level-data-dto';

export interface TrainingLevelDto extends TimelineLevelDataDTO {
    score: number;
    solution_displayed_time: number;
    correct_answer_time: number;
    wrong_answer_penalty: number;
    events: TimelineEventDTO[];
}
