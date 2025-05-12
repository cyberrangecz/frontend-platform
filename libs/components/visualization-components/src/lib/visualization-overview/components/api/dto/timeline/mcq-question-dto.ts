import { TimelineQuestionDTO } from './timeline-question-dto';

export class McqQuestionDTO extends TimelineQuestionDTO {
    options: string[];
    correct_answers: string[];
    player_answers: string[];
}
