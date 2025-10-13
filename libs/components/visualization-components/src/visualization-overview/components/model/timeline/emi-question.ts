import {TimelineQuestion} from './timeline-question';
import {AnswerPosition} from './answer-position';

export class EmiQuestion extends TimelineQuestion {
    row: string[];
    column: string[];
    correctAnswers: AnswerPosition[];
    playerAnswers: AnswerPosition[];
}
