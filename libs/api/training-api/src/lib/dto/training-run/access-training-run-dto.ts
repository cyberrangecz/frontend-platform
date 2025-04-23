import { AbstractLevelDTO } from '../level/abstract-level-dto';
import { BasicLevelInfoDTO } from '../level/basic-level-info-dto';
import { HintDTO } from '../level/training/hint-dto';
import { AbstractPhaseDTO } from '../phase/abstract-phase-dto';
import { BasicPhaseInfoDTO } from '../phase/basic-phase-info-dto';

/**
 * .
 */
export interface AccessTrainingRunDTO {
    abstract_level_dto?: AbstractLevelDTO;
    info_about_levels?: BasicLevelInfoDTO[];
    current_phase?: AbstractPhaseDTO;
    info_about_phases?: BasicPhaseInfoDTO[];
    training_run_id: number;
    sandbox_instance_ref_id: string;
    sandbox_definition_id: number;
    show_stepper_bar: boolean;
    start_time: Date;
    taken_solution: string;
    taken_hints: HintDTO[];
    local_environment: boolean;
    backward_mode: boolean;
    level_answered?: boolean;
    phase_answered?: boolean;
}
