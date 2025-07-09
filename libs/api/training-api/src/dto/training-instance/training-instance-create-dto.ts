/**
 * Training Instance to create.
 */
export class TrainingInstanceCreateDTO {
    end_time?: string;
    access_token?: string;
    start_time?: string;
    title?: string;
    training_definition_id?: number;
    pool_id?: number;
    local_environment?: boolean;
    sandbox_definition_id?: number;
    backward_mode?: boolean;
    show_stepper_bar?: boolean;
}
