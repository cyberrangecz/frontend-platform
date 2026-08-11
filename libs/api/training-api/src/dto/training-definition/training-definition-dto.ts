import {AbstractLevelDTO} from '../level/abstract-level-dto';

/**
 * Training Definition DTO carrying every attribute except the level collection.
 */
export class TrainingDefinitionDTO {
    description?: string;
    id?: number;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionDTO.StateEnum;
    title?: string;
    estimated_duration: number;
    last_edited?: Date;
    last_edited_by?: string;
    created_at: Date;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TrainingDefinitionDTO {
    export type StateEnum = 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
    export const StateEnum = {
        RELEASED: 'RELEASED' as StateEnum,
        ARCHIVED: 'ARCHIVED' as StateEnum,
        UNRELEASED: 'UNRELEASED' as StateEnum,
    };
}

/**
 * Training Definition DTO extended with the levels the definition is composed of.
 */
export class TrainingDefinitionWithLevelsDTO extends TrainingDefinitionDTO {
    levels?: AbstractLevelDTO[];
}
