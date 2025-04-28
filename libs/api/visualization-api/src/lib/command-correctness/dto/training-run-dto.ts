import { TraineeDTO } from './trainee-dto';

export class TrainingRunDTO {
    id: number;
    state: string;
    sandbox_instance_ref_id: number;
    participant_ref: TraineeDTO;
}
