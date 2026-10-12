/**
 * Training Definition to update.
 */
export class TrainingDefinitionUpdateDTO {
    description?: string;
    id?: number;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionUpdateDTOStateEnum;
    title?: string;
}

export type TrainingDefinitionUpdateDTOStateEnum = 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
export const TrainingDefinitionUpdateDTOStateEnum = {
    RELEASED: 'RELEASED' as TrainingDefinitionUpdateDTOStateEnum,
    ARCHIVED: 'ARCHIVED' as TrainingDefinitionUpdateDTOStateEnum,
    UNRELEASED: 'UNRELEASED' as TrainingDefinitionUpdateDTOStateEnum,
};
