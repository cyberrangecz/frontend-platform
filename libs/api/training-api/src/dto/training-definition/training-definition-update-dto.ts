/**
 * Training Definition to update.
 */
export class TrainingDefinitionUpdateDTO {
    description?: string;
    id?: number;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionUpdateDTO.StateEnum;
    title?: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TrainingDefinitionUpdateDTO {
    export type StateEnum = 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
    export const StateEnum = {
        RELEASED: 'RELEASED' as StateEnum,
        ARCHIVED: 'ARCHIVED' as StateEnum,
        UNRELEASED: 'UNRELEASED' as StateEnum,
    };
}
