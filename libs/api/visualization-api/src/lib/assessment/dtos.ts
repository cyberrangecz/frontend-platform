import { UserRefDTO } from '@crczp/training-api';

export class AnswerDTO {
    text: string;
    participants: UserRefDTO[];
    correct: boolean;
}

export class OptionDTO {
    text: string;
    participants: UserRefDTO[];
    correct: boolean;
}

export class QuestionDTO {
    id: number;
    question_type: string;
    text: string;
    order: number;
    answers: AnswerDTO[];
}

export class AssessmentDTO {
    id: number;
    title: string;
    order: number;
    assessment_type: string;
    questions: QuestionDTO[];
}

export class EmiAnswerDTO extends AnswerDTO {
    options: OptionDTO[];
}

