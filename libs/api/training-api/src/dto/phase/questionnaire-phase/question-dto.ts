import {ChoiceDTO} from './choice-dto';

export class QuestionDTO {
    id: number;
    order: number;
    text: string;
    question_type: QuestionDTO.QuestionTypeEnum;
    choices: ChoiceDTO[];
    answer_required: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace QuestionDTO {
    export type QuestionTypeEnum = 'FFQ' | 'MCQ' | 'RFQ';
    export const QuestionTypeEnum = {
        FFQ: 'FFQ' as QuestionTypeEnum,
        MCQ: 'MCQ' as QuestionTypeEnum,
        RFQ: 'RFQ' as QuestionTypeEnum,
    };
}
