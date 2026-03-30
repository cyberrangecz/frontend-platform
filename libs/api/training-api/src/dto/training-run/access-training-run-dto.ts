import {AbstractLevelDTO} from '../level/abstract-level-dto';
import {BasicLevelInfoDTO} from '../level/basic-level-info-dto';
import {HintDTO} from '../level/training/hint-dto';
import {AbstractPhaseDTO} from '../phase/abstract-phase-dto';
import {BasicPhaseInfoDTO} from '../phase/basic-phase-info-dto';

/** Allocation request summary (stages: IN_QUEUE, RUNNING, FINISHED, FAILED). */
export interface AllocationRequestSummaryDTO {
    id: number;
    allocation_unit_id: number;
    stages: string[];
}

/** Cleanup request summary (stages: IN_QUEUE, RUNNING, FINISHED, FAILED). */
export interface CleanupRequestSummaryDTO {
    id: number;
    allocation_unit_id?: number;
    stages: string[];
}

/** Summary of an active sandbox (single-sandbox-per-user). */
export interface ActiveSandboxSummaryDTO {
    id: number;
    pool_id: number;
    created_at: string;
    created_by_sub: string;
    sandbox_id: string | null;
    allocation_request?: AllocationRequestSummaryDTO;
    cleanup_request?: CleanupRequestSummaryDTO;
    allow_remove?: boolean;
    /** Training instance title for display (e.g. which training this sandbox belongs to). */
    training_instance_title?: string | null;
    training_instance_id?: number | null;
    /** When true, this sandbox belongs to a managed training instance; trainee cannot remove it. */
    training_instance_managed?: boolean;
}

/**
 * Access training run response. When allow_allocate is false, active_sandboxes lists sandboxes to remove first.
 */
export interface AccessTrainingRunDTO {
    abstract_level_dto?: AbstractLevelDTO;
    info_about_levels?: BasicLevelInfoDTO[];
    current_phase?: AbstractPhaseDTO;
    info_about_phases?: BasicPhaseInfoDTO[];
    training_run_id?: number;
    instance_id?: number;
    training_instance_title?: string;
    allow_allocate?: boolean;
    active_sandboxes?: ActiveSandboxSummaryDTO[];
    sandbox_instance_ref_id?: string;
    sandbox_definition_id?: number;
    show_stepper_bar: boolean;
    start_time: Date;
    taken_solution: string;
    taken_hints: HintDTO[];
    local_environment: boolean;
    backward_mode: boolean;
    level_answered?: boolean;
    phase_answered?: boolean;
    /** When true, this is a managed instance: trainee cannot allocate; only a sandbox assigned by Admin can be used. */
    managed?: boolean;
    /** Training instance access token; send as X-Training-Access-Token when calling sandbox-service (e.g. topology) for managed runs. */
    access_token?: string;
}
