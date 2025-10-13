export interface AbstractLevelDTO {
    id?: number;
    max_score?: number;
    estimated_duration?: number;
    minimal_possible_solve_time?: number;
    order?: number;
    snapshot_hook?: any;
    title?: string;
    level_type?: AbstractLevelDTO.LevelTypeEnum;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AbstractLevelDTO {
    export type LevelTypeEnum = 'INFO_LEVEL' | 'ASSESSMENT_LEVEL' | 'TRAINING_LEVEL' | 'ACCESS_LEVEL';
    export const LevelTypeEnum = {
        INFO: 'INFO_LEVEL' as LevelTypeEnum,
        ASSESSMENT: 'ASSESSMENT_LEVEL' as LevelTypeEnum,
        TRAINING: 'TRAINING_LEVEL' as LevelTypeEnum,
        ACCESS: 'ACCESS_LEVEL' as LevelTypeEnum,
    };
}
