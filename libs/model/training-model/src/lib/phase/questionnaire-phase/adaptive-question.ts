import { QuestionTypeEnum } from '../../enums/question-type.enum';
import { Choice } from './choice';

export class AdaptiveQuestion {
    id!: number;
    order!: number;
    text!: string;
    valid: boolean = false;
    questionType!: QuestionTypeEnum;
    relations!: number;
    choices: Choice[] = [];
    userAnswers?: string[];
    answerRequired!: boolean;
}
