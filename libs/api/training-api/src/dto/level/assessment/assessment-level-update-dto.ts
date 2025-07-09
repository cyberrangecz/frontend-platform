/**
 * Assessment Level to update.
 */
import {AbstractQuestionCreateDTO} from './abstact-question-dto';
import {AbstractLevelDTO} from '../abstract-level-dto';

export interface AssessmentLevelUpdateDTO {
    id?: number;
    title?: string;
    level_type?: AbstractLevelDTO.LevelTypeEnum;
    type?: AssessmentLevelUpdateDTO.TypeEnum;
    max_score?: number;
    estimated_duration: number;
    minimal_possible_solve_time: number;
    instructions?: string;
    questions?: AbstractQuestionCreateDTO[];
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AssessmentLevelUpdateDTO {
    export type TypeEnum = 'TEST' | 'QUESTIONNAIRE';
    export const TypeEnum = {
        TEST: 'TEST' as TypeEnum,
        QUESTIONNAIRE: 'QUESTIONNAIRE' as TypeEnum,
    };
}

export class AssessmentLevelUpdateDTOClass implements AssessmentLevelUpdateDTO {
    id: number;
    title: string;
    level_type: AbstractLevelDTO.LevelTypeEnum = 'ASSESSMENT_LEVEL';
    type: AssessmentLevelUpdateDTO.TypeEnum;
    instructions: string;
    max_score: number;
    questions: AbstractQuestionCreateDTO[];
    estimated_duration: number;
    minimal_possible_solve_time: number;
}
