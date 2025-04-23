import { TrainingDefinitionDTO } from '../training-definition/training-definition-dto';

/**
 * Training Instance.
 */
export interface TrainingInstanceDTO {
    end_time?: Date;
    id?: number;
    pool_id: number;
    start_time?: Date;
    title?: string;
    training_definition?: TrainingDefinitionDTO;
    access_token: string;
    last_edited_by?: string;
    local_environment?: boolean;
    sandbox_definition_id?: number;
    backward_mode?: boolean;
    show_stepper_bar?: boolean;
}
