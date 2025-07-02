import {TimelineLevel} from './timeline-level';

export class TrainingLevel extends TimelineLevel {
    score: number;
    solutionDisplayedTime: number;
    correctAnswerTime: number;
    wrongAnswerPenalty: number;

    constructor() {
        super();
    }
}
