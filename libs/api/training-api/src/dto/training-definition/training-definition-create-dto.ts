/**
 * Training Definition to create.
 */
export class TrainingDefinitionCreateDTO {
    description?: string;
    outcomes?: string[];
    prerequisites?: string[];
    state?: TrainingDefinitionCreateDTO.StateEnum;
    title?: string;
    variant_sandboxes?: boolean;
    default_content?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TrainingDefinitionCreateDTO {
    export type StateEnum = 'PRIVATED' | 'RELEASED' | 'ARCHIVED' | 'UNRELEASED';
    export const StateEnum = {
        PRIVATED: 'PRIVATED' as StateEnum,
        RELEASED: 'RELEASED' as StateEnum,
        ARCHIVED: 'ARCHIVED' as StateEnum,
        UNRELEASED: 'UNRELEASED' as StateEnum,
    };
}
