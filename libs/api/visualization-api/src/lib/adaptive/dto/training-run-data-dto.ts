import { TrainingRunPathNodeDTO } from './training-run-path-node-dto';
import { UserRefDTO } from '@crczp/training-api';

export interface TrainingRunDataDTO {
    training_run_id: number;
    trainee: UserRefDTO;
    training_run_path_nodes: TrainingRunPathNodeDTO[];
    local_environment: boolean;
}
