import { Question } from '@crczp/training-model';

/**
 * Event representing change of edited question
 */
export class QuestionChangeEvent {
    question: Question;
    index: number;

    constructor(question: Question, index: number) {
        this.question = question;
        this.index = index;
    }
}
