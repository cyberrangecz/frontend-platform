import {TrainingInstance} from '@crczp/training-model';
import {TrainingInstanceCreateDTO} from '../../dto/training-instance/training-instance-create-dto';
import {TrainingInstanceDTO} from '../../dto/training-instance/training-instance-dto';
import {TrainingInstanceUpdateDTO} from '../../dto/training-instance/training-instance-update-dto';
import {TrainingDefinitionMapper} from '../training-definition/training-definition-mapper';

/**
 * @dynamic
 */
export class TrainingInstanceMapper {
    static fromDTO(dto: TrainingInstanceDTO): TrainingInstance {
        const result = new TrainingInstance();
        result.id = dto.id;
        result.trainingDefinition = TrainingDefinitionMapper.fromDTO(dto.training_definition, false);
        result.startTime = new Date(dto.start_time);
        result.endTime = new Date(dto.end_time);
        result.title = dto.title;
        result.accessToken = dto.access_token;
        result.poolId = dto.pool_id;
        result.lastEditBy = dto.last_edited_by;
        result.localEnvironment = dto.local_environment;
        result.sandboxDefinitionId = dto.sandbox_definition_id;
        result.backwardMode = dto.backward_mode;
        result.showStepperBar = dto.show_stepper_bar;
        return result;
    }

    static fromDTOs(dtos: TrainingInstanceDTO[]): TrainingInstance[] {
        return dtos.map((dto) => TrainingInstanceMapper.fromDTO(dto));
    }

    static toCreateDTO(trainingInstance: TrainingInstance): TrainingInstanceCreateDTO {
        const result = new TrainingInstanceCreateDTO();
        result.title = trainingInstance.title;
        result.start_time = trainingInstance.startTime.toISOString();
        result.end_time = trainingInstance.endTime.toISOString();
        result.access_token = trainingInstance.accessToken;
        result.training_definition_id = trainingInstance.trainingDefinition.id;
        result.pool_id = trainingInstance.poolId;
        result.local_environment = trainingInstance.localEnvironment;
        result.sandbox_definition_id = trainingInstance.sandboxDefinitionId;
        result.backward_mode = trainingInstance.backwardMode;
        result.show_stepper_bar = trainingInstance.showStepperBar;
        return result;
    }

    static toUpdateDTO(trainingInstance: TrainingInstance): TrainingInstanceUpdateDTO {
        const result = new TrainingInstanceUpdateDTO();
        result.id = trainingInstance.id;
        result.title = trainingInstance.title;
        result.start_time = trainingInstance.startTime.toISOString();
        result.end_time = trainingInstance.endTime.toISOString();
        result.access_token = trainingInstance.accessToken;
        result.training_definition_id = trainingInstance.trainingDefinition.id;
        result.pool_id = trainingInstance.poolId;
        result.local_environment = trainingInstance.localEnvironment;
        result.sandbox_definition_id = trainingInstance.sandboxDefinitionId;
        result.backward_mode = trainingInstance.backwardMode;
        result.show_stepper_bar = trainingInstance.showStepperBar;
        return result;
    }
}
