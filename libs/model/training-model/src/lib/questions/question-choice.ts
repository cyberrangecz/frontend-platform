/**
 * One of types of questions in questionnaire. Traditional multiple-choice
 */
export class QuestionChoice {
    id!: number;
    text!: string;
    correct!: boolean;
    order!: number;
}
