export interface BasicLevelInfoDTO {
    id: number;
    level_type?: BasicLevelInfoDTOLevelTypeEnum;
    order?: number;
    title?: string;
}

export type BasicLevelInfoDTOLevelTypeEnum = 'ASSESSMENT_LEVEL' | 'INFO_LEVEL' | 'TRAINING_LEVEL' | 'ACCESS_LEVEL';
export const BasicLevelInfoDTOLevelTypeEnum = {
    ASSESSMENT: 'ASSESSMENT_LEVEL' as BasicLevelInfoDTOLevelTypeEnum,
    INFO: 'INFO_LEVEL' as BasicLevelInfoDTOLevelTypeEnum,
    TRAINING: 'TRAINING_LEVEL' as BasicLevelInfoDTOLevelTypeEnum,
    ACCESS: 'ACCESS_LEVEL' as BasicLevelInfoDTOLevelTypeEnum,
};
