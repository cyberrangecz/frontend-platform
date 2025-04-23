import { ForbiddenCommandDTO } from '../detection-event/forbidden-command-dto';

/**
 * Cheating Detection DTO.
 */
export interface CheatingDetectionDTO {
    training_instance_id: number;
    executed_by: string;
    execute_time: Date;
    proximity_threshold?: number;
    id: number;
    current_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    results: number;
    answer_similarity_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    location_similarity_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    time_proximity_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    minimal_solve_time_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    no_commands_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    forbidden_commands_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    forbidden_commands?: ForbiddenCommandDTO[];
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CheatingDetectionDTO {
    export type CheatingDetectionStateEnum = 'QUEUED' | 'RUNNING' | 'FINISHED' | 'DISABLED';
    export const CheatingDetectionStateEnum = {
        QUEUED: 'QUEUED' as CheatingDetectionStateEnum,
        RUNNING: 'RUNNING' as CheatingDetectionStateEnum,
        FINISHED: 'FINISHED' as CheatingDetectionStateEnum,
        DISABLED: 'DISABLED' as CheatingDetectionStateEnum,
    };
}

export class CheatingDetectionDTOClass implements CheatingDetectionDTO {
    training_instance_id: number;
    executed_by: string;
    execute_time: Date;
    proximity_threshold?: number;
    id: number;
    current_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    results: number;
    answer_similarity_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    location_similarity_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    time_proximity_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    minimal_solve_time_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    no_commands_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    forbidden_commands_state: CheatingDetectionDTO.CheatingDetectionStateEnum;
    forbidden_commands?: ForbiddenCommandDTO[];
}
