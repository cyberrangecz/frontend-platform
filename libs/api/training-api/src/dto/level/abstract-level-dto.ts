export interface AbstractLevelDTO {
    id?: number;
    max_score?: number;
    estimated_duration?: number;
    minimal_possible_solve_time?: number;
    order?: number;
    snapshot_hook?: any;
    title?: string;
    level_type?: AbstractLevelDTOLevelTypeEnum;
}

export type AbstractLevelDTOLevelTypeEnum = 'INFO_LEVEL' | 'ASSESSMENT_LEVEL' | 'TRAINING_LEVEL' | 'ACCESS_LEVEL';
export const AbstractLevelDTOLevelTypeEnum = {
    INFO: 'INFO_LEVEL',
    ASSESSMENT: 'ASSESSMENT_LEVEL',
    TRAINING: 'TRAINING_LEVEL',
    ACCESS: 'ACCESS_LEVEL',
} as const satisfies Record<string, AbstractLevelDTOLevelTypeEnum>;
