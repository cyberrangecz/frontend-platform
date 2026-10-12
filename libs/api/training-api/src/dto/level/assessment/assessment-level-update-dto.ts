/**
 * Assessment Level to update.
 */
import {AbstractQuestionCreateDTO} from './abstact-question-dto';
import {AbstractLevelDTOLevelTypeEnum} from '../abstract-level-dto';

export interface AssessmentLevelUpdateDTO {
    id?: number;
    title?: string;
    level_type?: AbstractLevelDTOLevelTypeEnum;
    type?: AssessmentLevelUpdateDTOTypeEnum;
    max_score?: number;
    estimated_duration: number;
    minimal_possible_solve_time: number;
    instructions?: string;
    questions?: AbstractQuestionCreateDTO[];
}

export type AssessmentLevelUpdateDTOTypeEnum = 'TEST' | 'QUESTIONNAIRE';
export const AssessmentLevelUpdateDTOTypeEnum = {
    TEST: 'TEST' as AssessmentLevelUpdateDTOTypeEnum,
    QUESTIONNAIRE: 'QUESTIONNAIRE' as AssessmentLevelUpdateDTOTypeEnum,
};

export class AssessmentLevelUpdateDTOClass implements AssessmentLevelUpdateDTO {
    id: number;
    title: string;
    level_type: AbstractLevelDTOLevelTypeEnum = 'ASSESSMENT_LEVEL';
    type: AssessmentLevelUpdateDTOTypeEnum;
    instructions: string;
    max_score: number;
    questions: AbstractQuestionCreateDTO[];
    estimated_duration: number;
    minimal_possible_solve_time: number;
}
