import { AnswerDTO } from './answer-dto';

export class QuestionDTO {
    id: number;
    question_type: string;
    text: string;
    order: number;
    answers: AnswerDTO[];
}
