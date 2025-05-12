import { TimelineQuestionDTO } from './timeline-question-dto';
import { AnswerPositionDTO } from './answer-position-dto';

export class EmiQuestionDTO extends TimelineQuestionDTO {
    row: string[];
    column: string[];
    correct_answers: AnswerPositionDTO[];
    player_answers: AnswerPositionDTO[];
}
