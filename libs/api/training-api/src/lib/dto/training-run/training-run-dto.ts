import { AbstractLevelDTO } from '../level/abstract-level-dto';
import { UserRefDTO } from '../user/user-ref-dto';
import { AbstractPhaseDTO } from '../phase/abstract-phase-dto';

/**
 * .
 */
export interface TrainingRunDTO {
    current_level?: AbstractLevelDTO;
    current_phase?: AbstractPhaseDTO;
    end_time?: Date;
    event_log_reference?: string;
    id?: number;
    sandbox_instance_ref_id?: string;
    sandbox_instance_allocation_id?: number;
    participant_ref: UserRefDTO;
    start_time?: Date;
    state?: TrainingRunDTO.StateEnum;
    definition_id: number;
    instance_id: number;
    event_logging_state?: boolean;
    command_logging_state?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TrainingRunDTO {
    export type StateEnum = 'RUNNING' | 'FINISHED' | 'ARCHIVED';
    export const StateEnum = {
        RUNNING: 'RUNNING' as StateEnum,
        FINISHED: 'FINISHED' as StateEnum,
        ARCHIVED: 'ARCHIVED' as StateEnum,
    };
}
