import { DetectionEventParticipant } from '@crczp/training-model';
import { DetectionEventParticipantDTO } from '../../dto/detection-event/detection-event-participant-dto';

export class DetectionEventParticipantMapper {
    static fromDTO(dto: DetectionEventParticipantDTO): DetectionEventParticipant {
        return {
            ipAddress: dto.ip_address,
            occurredAt: dto.occurred_at,
            participantName: dto.participant_name,
            solvedInTime: dto.solved_in_time,
            userId: dto.user_id,
            detectionEventId: dto.detection_event_id,
        };
    }

    static fromDTOs(dtos: DetectionEventParticipantDTO[]): DetectionEventParticipant[] {
        return dtos.map((dto) => DetectionEventParticipantMapper.fromDTO(dto));
    }
}
