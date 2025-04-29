import { QuestionDTO } from './question-dto';

export class AssessmentDTO {
    id: number;
    title: string;
    order: number;
    assessment_type: string;
    questions: QuestionDTO[];
}
