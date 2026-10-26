import {AbstractLevelDTO} from '../abstract-level-dto';
import {AbstractQuestionCreateDTO} from './abstact-question-dto';

export interface AssessmentLevelDTO extends AbstractLevelDTO {
    assessment_type: AssessmentLevelDTOAssessmentTypeEnum;
    instructions: string;
    questions: AbstractQuestionCreateDTO[];
}

export type AssessmentLevelDTOAssessmentTypeEnum = 'TEST' | 'QUESTIONNAIRE';
export const AssessmentLevelDTOAssessmentTypeEnum = {
    TEST: 'TEST' as AssessmentLevelDTOAssessmentTypeEnum,
    QUESTIONNAIRE: 'QUESTIONNAIRE' as AssessmentLevelDTOAssessmentTypeEnum,
};
