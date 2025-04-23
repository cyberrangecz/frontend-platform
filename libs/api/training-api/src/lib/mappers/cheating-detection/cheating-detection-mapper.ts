import { CheatingDetection, CheatingDetectionStateEnum } from '@crczp/training-model';
import { CheatingDetectionDTO, CheatingDetectionDTOClass } from '../../dto/cheating-detection/cheating-detection-dto';
import { ForbiddenCommandMapper } from '../detection-event/forbidden-command-mapper';

export class CheatingDetectionMapper {
    static fromDTO(dto: CheatingDetectionDTO): CheatingDetection {
        const result = new CheatingDetection();

        result.trainingInstanceId = dto.training_instance_id;
        result.executedBy = dto.executed_by;
        result.executeTime = dto.execute_time;
        result.id = dto.id;
        result.proximityThreshold = dto.proximity_threshold;
        result.currentState = this.typeFromDTO(dto.current_state);
        result.results = dto.results;
        result.answerSimilarityState = this.typeFromDTO(dto.answer_similarity_state);
        result.locationSimilarityState = this.typeFromDTO(dto.location_similarity_state);
        result.timeProximityState = this.typeFromDTO(dto.time_proximity_state);
        result.minimalSolveTimeState = this.typeFromDTO(dto.minimal_solve_time_state);
        result.noCommandsState = this.typeFromDTO(dto.no_commands_state);
        result.forbiddenCommandsState = this.typeFromDTO(dto.forbidden_commands_state);
        if (dto.forbidden_commands) {
            result.forbiddenCommands = ForbiddenCommandMapper.fromDTOs(dto.forbidden_commands);
        }
        return result;
    }

    static fromDTOs(dtos: CheatingDetectionDTO[]): CheatingDetection[] {
        return dtos.map((dto) => CheatingDetectionMapper.fromDTO(dto));
    }

    static toDTO(cheatingDetection: CheatingDetection): CheatingDetectionDTO {
        const result = new CheatingDetectionDTOClass();
        result.training_instance_id = cheatingDetection.trainingInstanceId;
        result.executed_by = cheatingDetection.executedBy;
        result.execute_time = cheatingDetection.executeTime;
        result.id = cheatingDetection.id;
        result.current_state = this.typeToDTO(cheatingDetection.currentState);
        result.results = cheatingDetection.results;
        result.proximity_threshold = cheatingDetection.proximityThreshold;
        result.answer_similarity_state = this.typeToDTO(cheatingDetection.answerSimilarityState);
        result.location_similarity_state = this.typeToDTO(cheatingDetection.locationSimilarityState);
        result.time_proximity_state = this.typeToDTO(cheatingDetection.timeProximityState);
        result.minimal_solve_time_state = this.typeToDTO(cheatingDetection.minimalSolveTimeState);
        result.no_commands_state = this.typeToDTO(cheatingDetection.noCommandsState);
        result.forbidden_commands_state = this.typeToDTO(cheatingDetection.forbiddenCommandsState);
        if (cheatingDetection.forbiddenCommands) {
            result.forbidden_commands = ForbiddenCommandMapper.toDTOs(cheatingDetection.forbiddenCommands);
        }
        return result;
    }

    private static typeToDTO(type: CheatingDetectionStateEnum): CheatingDetectionDTO.CheatingDetectionStateEnum {
        switch (type) {
            case CheatingDetectionStateEnum.Running:
                return CheatingDetectionDTO.CheatingDetectionStateEnum.RUNNING;
            case CheatingDetectionStateEnum.Queued:
                return CheatingDetectionDTO.CheatingDetectionStateEnum.QUEUED;
            case CheatingDetectionStateEnum.Disabled:
                return CheatingDetectionDTO.CheatingDetectionStateEnum.DISABLED;
            case CheatingDetectionStateEnum.Finished:
                return CheatingDetectionDTO.CheatingDetectionStateEnum.FINISHED;
            default:
                console.error('Could not map CheatingDetectionStateEnum to any known DTO');
        }
    }

    private static typeFromDTO(type: CheatingDetectionDTO.CheatingDetectionStateEnum): CheatingDetectionStateEnum {
        switch (type) {
            case CheatingDetectionDTO.CheatingDetectionStateEnum.RUNNING:
                return CheatingDetectionStateEnum.Running;
            case CheatingDetectionDTO.CheatingDetectionStateEnum.QUEUED:
                return CheatingDetectionStateEnum.Queued;
            case CheatingDetectionDTO.CheatingDetectionStateEnum.DISABLED:
                return CheatingDetectionStateEnum.Disabled;
            case CheatingDetectionDTO.CheatingDetectionStateEnum.FINISHED:
                return CheatingDetectionStateEnum.Finished;
            default:
                console.error('Could not map CheatingDetectionStateEnum to any known type');
        }
    }
}
