export interface AbstractQuestionCreateDTO {
    id?: number;
    text: string;
    question_type: AbstractQuestionDTO.QuestionTypeEnum;
    answer_required: boolean;
    order: number;
    penalty?: number;
    points?: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AbstractQuestionDTO {
    export type QuestionTypeEnum = 'FFQ' | 'MCQ' | 'EMI';
    export const QuestionTypeEnum = {
        FFQ: 'FFQ' as QuestionTypeEnum,
        MCQ: 'MCQ' as QuestionTypeEnum,
        EMI: 'EMI' as QuestionTypeEnum,
    };
}
