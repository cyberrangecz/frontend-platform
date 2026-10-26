import {ForbiddenCommandDTO} from '../detection-event/forbidden-command-dto';

/**
 * Cheating Detection DTO.
 */
export interface CheatingDetectionDTO {
    training_instance_id: number;
    executed_by: string;
    execute_time: Date;
    proximity_threshold?: number;
    id: number;
    current_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    results: number;
    answer_similarity_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    location_similarity_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    time_proximity_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    minimal_solve_time_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    no_commands_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    forbidden_commands_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    forbidden_commands?: ForbiddenCommandDTO[];
}

export type CheatingDetectionDTOCheatingDetectionStateEnum = 'QUEUED' | 'RUNNING' | 'FINISHED' | 'DISABLED';
export const CheatingDetectionDTOCheatingDetectionStateEnum = {
    QUEUED: 'QUEUED' as CheatingDetectionDTOCheatingDetectionStateEnum,
    RUNNING: 'RUNNING' as CheatingDetectionDTOCheatingDetectionStateEnum,
    FINISHED: 'FINISHED' as CheatingDetectionDTOCheatingDetectionStateEnum,
    DISABLED: 'DISABLED' as CheatingDetectionDTOCheatingDetectionStateEnum,
};

export class CheatingDetectionDTOClass implements CheatingDetectionDTO {
    training_instance_id: number;
    executed_by: string;
    execute_time: Date;
    proximity_threshold?: number;
    id: number;
    current_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    results: number;
    answer_similarity_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    location_similarity_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    time_proximity_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    minimal_solve_time_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    no_commands_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    forbidden_commands_state: CheatingDetectionDTOCheatingDetectionStateEnum;
    forbidden_commands?: ForbiddenCommandDTO[];
}
