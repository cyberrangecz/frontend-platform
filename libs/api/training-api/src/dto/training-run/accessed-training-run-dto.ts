/**
 * .
 */
export interface AccessedTrainingRunDTO {
    current_level_order?: number;
    current_phase_order?: number;
    id?: number;
    number_of_levels?: number;
    number_of_phases?: number;
    possible_action?: AccessedTrainingRunDTO.PossibleActionEnum;
    title?: string;
    training_instance_end_date?: Date;
    training_instance_start_date?: Date;
    local_environment?: boolean;
    sandbox_definition_id?: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AccessedTrainingRunDTO {
    export type PossibleActionEnum = 'RESULTS';
    export const PossibleActionEnum = {
        RESULTS: 'RESULTS' as PossibleActionEnum,
        RESUME: 'RESUME' as PossibleActionEnum,
        NONE: 'NONE' as PossibleActionEnum,
    };
}
