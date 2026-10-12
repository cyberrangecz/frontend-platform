/**
 * Training Definition to create.
 */
export class TrainingDefinitionCreateDTO {
    description?: string;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionCreateDTOStateEnum;
    title?: string;
    default_content?: boolean;
}

export type TrainingDefinitionCreateDTOStateEnum = 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
export const TrainingDefinitionCreateDTOStateEnum = {
    RELEASED: 'RELEASED' as TrainingDefinitionCreateDTOStateEnum,
    ARCHIVED: 'ARCHIVED' as TrainingDefinitionCreateDTOStateEnum,
    UNRELEASED: 'UNRELEASED' as TrainingDefinitionCreateDTOStateEnum,
};
