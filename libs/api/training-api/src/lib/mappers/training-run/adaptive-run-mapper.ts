import {TrainingRun, TrainingRunStateEnum} from '@crczp/training-model';
import {TrainingRunDTO} from '../../dto/training-run/training-run-dto';
import {UserMapper} from '../user/user-mapper';
import {PhaseMapper} from '../phase/phase-mapper';

/**
 * @dynamic
 */
export class AdaptiveRunMapper {
    static fromDTOs(dtos: TrainingRunDTO[]): TrainingRun[] {
        return dtos.map((dto) => this.fromDTO(dto));
    }

    static fromDTO(dto: TrainingRunDTO): TrainingRun {
        const result = new TrainingRun();
        result.id = dto.id;
        result.trainingDefinitionId = dto.definition_id;
        result.trainingInstanceId = dto.instance_id;
        result.startTime = new Date(dto.start_time);
        result.endTime = new Date(dto.end_time);
        result.eventLogReference = dto.event_log_reference;
        result.sandboxInstanceId = dto.sandbox_instance_ref_id;
        result.eventLogging = dto.event_logging_state;
        result.commandLogging = dto.command_logging_state;
        result.player = UserMapper.fromDTO(dto.participant_ref);
        result.state = this.resolveState(dto.state);
        if (result.currentLevel) {
            result.currentLevel = PhaseMapper.fromDTO(dto.current_phase);
        }
        return result;
    }

    private static resolveState(state: TrainingRunDTO.StateEnum): TrainingRunStateEnum {
        switch (state) {
            case TrainingRunDTO.StateEnum.RUNNING:
                return TrainingRunStateEnum.RUNNING;
            case TrainingRunDTO.StateEnum.FINISHED:
                return TrainingRunStateEnum.FINISHED;
            case TrainingRunDTO.StateEnum.ARCHIVED:
                return TrainingRunStateEnum.ARCHIVED;
            default: {
                console.error(`Unsupported training run state of value: ${state}`);
                return undefined;
            }
        }
    }
}
