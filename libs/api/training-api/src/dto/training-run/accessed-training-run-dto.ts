/**
 * .
 */
export interface AccessedTrainingRunDTO {
    current_level_order?: number;
    id?: number;
    number_of_levels?: number;
    possible_action?: AccessedTrainingRunDTOPossibleActionEnum;
    title?: string;
    training_instance_end_date?: Date;
    training_instance_start_date?: Date;
    local_environment?: boolean;
    sandbox_definition_id?: number;
}

export type AccessedTrainingRunDTOPossibleActionEnum = 'RESULTS';
export const AccessedTrainingRunDTOPossibleActionEnum = {
    RESULTS: 'RESULTS' as AccessedTrainingRunDTOPossibleActionEnum,
    RESUME: 'RESUME' as AccessedTrainingRunDTOPossibleActionEnum,
    NONE: 'NONE' as AccessedTrainingRunDTOPossibleActionEnum,
};
