/**
 * Abstract parent class of all possible types of questions
 */

export abstract class Question {
    public static readonly MAX_QUESTION_SCORE = 100;
    public static readonly MAX_QUESTION_PENALTY = 100;

    id!: number;
    title!: string;
    order!: number;
    score = 0;
    penalty = 0;
    required!: boolean;
    valid = true;

    protected constructor(title: string) {
        this.title = title;
    }
}
