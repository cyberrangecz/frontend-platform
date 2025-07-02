import {UserRefDTO} from '@crczp/training-api';
import {AbstractPhaseDTO} from './phase/abstract-phase-dto';

export interface TrainingRunDataDTO {
    training_run_id: number;
    trainee: UserRefDTO;
    training_run_path_nodes: AdaptiveTrainingRunPathNodeDTO[];
    local_environment: boolean;
}
export interface AdaptiveTrainingRunPathNodeDTO {
    phase_id: number;
    phase_order: number;
    task_id: number;
    task_order: number;
}
export interface TaskDTO {
    id: number;
    order: number;
    answer: string;
    content?: string;
    solution?: string;
}
export interface AdaptiveVisualizationDataDTO {
    phases: AbstractPhaseDTO[];
    training_runs_data: TrainingRunDataDTO[];
}
