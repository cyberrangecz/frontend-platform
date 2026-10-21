import { LevelUpdateDTO } from '../level/level-update-dto';

/**
 * Training Definition to create, with its ordered levels. Levels carry no ids.
 */
export class TrainingDefinitionCreateDTO {
    description?: string;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionCreateDTOStateEnum;
    title?: string;
    levels: LevelUpdateDTO[];
}

export type TrainingDefinitionCreateDTOStateEnum = 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
export const TrainingDefinitionCreateDTOStateEnum = {
    RELEASED: 'RELEASED' as TrainingDefinitionCreateDTOStateEnum,
    ARCHIVED: 'ARCHIVED' as TrainingDefinitionCreateDTOStateEnum,
    UNRELEASED: 'UNRELEASED' as TrainingDefinitionCreateDTOStateEnum,
};
