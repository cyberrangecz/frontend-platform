import { AdaptiveQuestion } from '@crczp/training-model';

/**
 * Event representing change of edited question
 */
export class QuestionChangeEvent {
    question: AdaptiveQuestion;
    index: number;

    constructor(question: AdaptiveQuestion, index: number) {
        this.question = question;
        this.index = index;
    }
}
