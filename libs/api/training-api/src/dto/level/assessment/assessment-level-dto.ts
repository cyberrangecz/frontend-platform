import {AbstractLevelDTO} from '../abstract-level-dto';
import {AbstractQuestionCreateDTO} from './abstact-question-dto';

export interface AssessmentLevelDTO extends AbstractLevelDTO {
    assessment_type: AssessmentLevelDTO.AssessmentTypeEnum;
    instructions: string;
    questions: AbstractQuestionCreateDTO[];
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AssessmentLevelDTO {
    export type AssessmentTypeEnum = 'TEST' | 'QUESTIONNAIRE';
    export const AssessmentTypeEnum = {
        TEST: 'TEST' as AssessmentTypeEnum,
        QUESTIONNAIRE: 'QUESTIONNAIRE' as AssessmentTypeEnum,
    };
}
