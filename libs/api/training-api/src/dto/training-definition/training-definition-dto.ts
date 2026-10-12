import {AbstractLevelDTO} from '../level/abstract-level-dto';

/**
 * Training Definition DTO carrying every attribute except the level collection.
 */
export class TrainingDefinitionDTO {
    description?: string;
    id?: number;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionDTOStateEnum;
    title?: string;
    estimated_duration: number;
    last_edited?: Date;
    last_edited_by?: string;
    created_at: Date;
}

export type TrainingDefinitionDTOStateEnum = 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
export const TrainingDefinitionDTOStateEnum = {
    RELEASED: 'RELEASED' as TrainingDefinitionDTOStateEnum,
    ARCHIVED: 'ARCHIVED' as TrainingDefinitionDTOStateEnum,
    UNRELEASED: 'UNRELEASED' as TrainingDefinitionDTOStateEnum,
};

/**
 * Training Definition DTO extended with the levels the definition is composed of.
 */
export class TrainingDefinitionWithLevelsDTO extends TrainingDefinitionDTO {
    levels?: AbstractLevelDTO[];
}
