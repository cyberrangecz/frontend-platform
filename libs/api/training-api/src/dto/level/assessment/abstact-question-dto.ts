export interface AbstractQuestionCreateDTO {
    id?: number;
    text: string;
    question_type: AbstractQuestionDTOQuestionTypeEnum;
    answer_required: boolean;
    order: number;
    penalty?: number;
    points?: number;
}

export type AbstractQuestionDTOQuestionTypeEnum = 'FFQ' | 'MCQ' | 'EMI';
export const AbstractQuestionDTOQuestionTypeEnum = {
    FFQ: 'FFQ' as AbstractQuestionDTOQuestionTypeEnum,
    MCQ: 'MCQ' as AbstractQuestionDTOQuestionTypeEnum,
    EMI: 'EMI' as AbstractQuestionDTOQuestionTypeEnum,
};
