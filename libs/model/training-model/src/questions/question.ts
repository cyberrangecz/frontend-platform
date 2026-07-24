import { Z } from 'zod-class';
import { z } from 'zod';
import { QuestionTypeEnum } from '../enums/question-type.enum';

/** Basic read-only question data safe for all roles. Subset of {@link Question}. */
export class QuestionBasic extends Z.class({
    id: z.number(),
    order: z.number(),
    score: z.number(),
    penalty: z.number(),
    required: z.boolean(),
    questionType: z.nativeEnum(QuestionTypeEnum),
}) {}

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
    questionType!: QuestionTypeEnum;

    protected constructor(title: string) {
        this.title = title;
    }
}
