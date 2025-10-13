import {TimelineQuestionDTO} from './timeline-question-dto';

export class FfqQuestionDTO extends TimelineQuestionDTO {
    correct_answers: string[];
    player_answer: string;
}
