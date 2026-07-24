import {AbstractLevelDTO} from '../level/abstract-level-dto';

/**
 * Training Definition DTO.
 */
export class TrainingDefinitionDTO {
    levels?: AbstractLevelDTO[];
    description?: string;
    id?: number;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionDTO.StateEnum;
    title?: string;
    estimated_duration: number;
    last_edited?: Date;
    variant_sandboxes: boolean;
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
