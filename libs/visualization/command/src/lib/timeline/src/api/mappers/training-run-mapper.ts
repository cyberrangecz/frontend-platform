import { TrainingRunDTO } from '../dto/training-run-dto';
import { TrainingRun } from '../../model/training-run';
import { ParticipantMapper } from './participant-mapper';

/**
 * @dynamic
 */
export class TrainingRunMapper {
    static fromDTOs(dtos: TrainingRunDTO[]): TrainingRun[] {
        return dtos.map((dto) => TrainingRunMapper.fromDTO(dto));
    }

    static fromDTO(dto: TrainingRunDTO): TrainingRun {
        const result = new TrainingRun();
        result.id = dto.id;
        result.sandboxInstanceRefId = dto.sandbox_instance_ref_id;
        result.state = dto.state;
        result.participantRef = ParticipantMapper.fromDTO(dto.participant_ref);
        return result;
    }
}
