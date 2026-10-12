import {AbstractLevelDTO} from '../level/abstract-level-dto';
import {BasicLevelInfoDTO} from '../level/basic-level-info-dto';
import {HintDTO} from '../level/training/hint-dto';
import {TraineeSandboxDTO} from './trainee-sandbox-dto';

/**
 * The run's current level, or none while the sandbox the trainee allocates for themselves is not
 * ready.
 */
export interface AccessTrainingRunDTO {
    abstract_level_dto?: AbstractLevelDTO;
    info_about_levels?: BasicLevelInfoDTO[];
    /** Absent when another sandbox of the trainee keeps them from getting a run */
    training_run_id?: number;
    sandbox_instance_ref_id: string;
    sandbox_definition_id: number;
    show_stepper_bar: boolean;
    start_time: Date;
    taken_solution: string;
    taken_hints: HintDTO[];
    local_environment: boolean;
    backward_mode: boolean;
    level_answered?: boolean;
    instance_id?: number;
    training_instance_title?: string;
    managed?: boolean;
    allow_allocate?: boolean;
    active_sandboxes?: TraineeSandboxDTO[];
}
