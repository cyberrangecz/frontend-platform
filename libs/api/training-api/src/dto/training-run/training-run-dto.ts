import {AbstractLevelDTO} from '../level/abstract-level-dto';
import {UserRefDTO} from '../user/user-ref-dto';

/**
 * .
 */
export interface TrainingRunDTO {
    current_level?: AbstractLevelDTO;
    end_time?: Date;
    event_log_reference?: string;
    id?: number;
    sandbox_instance_ref_id?: string;
    sandbox_instance_allocation_id?: number;
    participant_ref: UserRefDTO;
    start_time?: Date;
    state?: TrainingRunDTOStateEnum;
    definition_id: number;
    instance_id: number;
    event_logging_state?: boolean;
    command_logging_state?: boolean;
}

export type TrainingRunDTOStateEnum = 'RUNNING' | 'FINISHED' | 'ARCHIVED';
export const TrainingRunDTOStateEnum = {
    RUNNING: 'RUNNING' as TrainingRunDTOStateEnum,
    FINISHED: 'FINISHED' as TrainingRunDTOStateEnum,
    ARCHIVED: 'ARCHIVED' as TrainingRunDTOStateEnum,
};
