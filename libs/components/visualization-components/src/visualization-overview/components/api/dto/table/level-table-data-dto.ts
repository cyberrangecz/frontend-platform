export class LevelTableDataDTO {
    id: number;
    order: number;
    level_type: BasicLevelInfoDTO.LevelTypeEnum;
    participant_level_score: number;
    wrong_answers?: number;
    hints_taken?: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BasicLevelInfoDTO {
    export type LevelTypeEnum = 'ASSESSMENT_LEVEL' | 'INFO_LEVEL' | 'TRAINING_LEVEL' | 'ACCESS_LEVEL';
    export const LevelTypeEnum = {
        ASSESSMENT: 'ASSESSMENT_LEVEL' as LevelTypeEnum,
        INFO: 'INFO_LEVEL' as LevelTypeEnum,
        TRAINING: 'TRAINING_LEVEL' as LevelTypeEnum,
        ACCESS: 'ACCESS_LEVEL' as LevelTypeEnum,
    };
}
