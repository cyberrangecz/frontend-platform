export class TimelineQuestionDTO {
    question_type: BasicQuestionInfoDTO.QuestionTypeEnum;
    order: number;
    text: string;
    penalty: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BasicQuestionInfoDTO {
    export type QuestionTypeEnum =
        | 'FFQ_QUESTION'
        | 'MCQ_QUESTION'
        | 'EMI_QUESTION';
    export const QuestionTypeEnum = {
        FFQ: 'FFQ_QUESTION' as QuestionTypeEnum,
        MCQ: 'MCQ_QUESTION' as QuestionTypeEnum,
        EMI: 'EMI_QUESTION' as QuestionTypeEnum,
    };
}
