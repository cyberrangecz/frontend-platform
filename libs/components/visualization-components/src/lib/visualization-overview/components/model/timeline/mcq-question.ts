import { TimelineQuestion } from './timeline-question';

export class McqQuestion extends TimelineQuestion {
    options: string[];
    correctAnswers: string[];
    playerAnswers: string[];
}
