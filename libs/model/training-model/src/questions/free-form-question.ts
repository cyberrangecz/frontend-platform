import {Question} from './question';
import {QuestionChoice} from './question-choice';

/**
 * One of types of questions. Has question and answer
 */
export class FreeFormQuestion extends Question {
    choices: QuestionChoice[] = [];
    userAnswers: string[] = [];

    constructor(title: string) {
        super(title);
    }
}
