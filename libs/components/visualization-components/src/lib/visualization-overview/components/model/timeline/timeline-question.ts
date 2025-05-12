export class TimelineQuestion {
    questionType: BasicQuestionInfo.QuestionTypeEnum;
    order: number;
    text: string;
    penalty: number;
}

export namespace BasicQuestionInfo {
    export type QuestionTypeEnum = 'FFQ_QUESTION' | 'MCQ_QUESTION' | 'EMI_QUESTION';
    export const AssessmentLevelTypeEnum = {
        FFQ: 'FFQ_QUESTION' as QuestionTypeEnum,
        MCQ: 'MCQ_QUESTION' as QuestionTypeEnum,
        EMI: 'EMI_QUESTION' as QuestionTypeEnum,
    };
}
