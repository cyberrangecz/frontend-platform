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
    variant_sandboxes?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TrainingDefinitionUpdateDTO {
    export type StateEnum = 'PRIVATED' | 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
    export const StateEnum = {
        PRIVATED: 'PRIVATED' as StateEnum,
        RELEASED: 'RELEASED' as StateEnum,
        ARCHIVED: 'ARCHIVED' as StateEnum,
        UNRELEASED: 'UNRELEASED' as StateEnum,
    };
}
