import {Question} from './question';
import {QuestionChoice} from './question-choice';

/**
 * One of types of questions in questionnaire. Traditional multiple-choice
 */
export class MultipleChoiceQuestion extends Question {
    choices: QuestionChoice[] = [];
    userAnswers: string[] = [];

    constructor(title: string) {
        super(title);
    }
}
