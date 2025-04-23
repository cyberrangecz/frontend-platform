import { AbstractDetectionEvent } from '@crczp/training-model';
import { DetectionEventDTO } from '../../dto/detection-event/detection-event-dto';
import { AnswerSimilarityDetectionEventDTO } from '../../dto/detection-event/answer-similarity/answer-similarity-detection-event-dto';
import { LocationSimilarityDetectionEventDTO } from '../../dto/detection-event/location-similarity/location_similarity-detection-event-dto';
import { TimeProximityDetectionEventDTO } from '../../dto/detection-event/time-proximity/time_proximity-detection-event-dto';
import { MinimalSolveTimeDetectionEventDTO } from '../../dto/detection-event/minimal-solve-time/minimal-solve-time-detection-event-dto';
import { ForbiddenCommandsDetectionEventDTO } from '../../dto/detection-event/forbidden-commands/forbidden-commands-detection-event-dto';
import { AnswerSimilarityDetectionEventMapper } from './answer-similarity-detection-event-mapper';
import { LocationSimilarityDetectionEventMapper } from './location-similarity-detection-event-mapper';
import { TimeProximityDetectionEventMapper } from './time-proximity-detection-event-mapper';
import { MinimalSolveTimeDetectionEventMapper } from './minimal-solve-time-detection-event-mapper';
import { NoCommandsDetectionEventMapper } from './no-commands-detection-event-mapper';
import { ForbiddenCommandsDetectionEventMapper } from './forbidden-commands-detection-event-mapper';
import { NoCommandsDetectionEventDTO } from '../../dto/detection-event/no-commands/no-commands-detection-event-dto';

export class DetectionEventMapper {
    static fromDTO(dto: DetectionEventDTO): AbstractDetectionEvent {
        let detectionEvent = new AbstractDetectionEvent();
        switch (dto.detection_event_type) {
            case DetectionEventDTO.AbstractDetectionEventTypeEnum.ANSWER_SIMIlARITY: {
                detectionEvent = AnswerSimilarityDetectionEventMapper.fromDTO(dto as AnswerSimilarityDetectionEventDTO);
                break;
            }
            case DetectionEventDTO.AbstractDetectionEventTypeEnum.LOCATION_SIMILARITY: {
                detectionEvent = LocationSimilarityDetectionEventMapper.fromDTO(
                    dto as LocationSimilarityDetectionEventDTO,
                );
                break;
            }
            case DetectionEventDTO.AbstractDetectionEventTypeEnum.TIME_PROXIMITY: {
                detectionEvent = TimeProximityDetectionEventMapper.fromDTO(dto as TimeProximityDetectionEventDTO);
                break;
            }
            case DetectionEventDTO.AbstractDetectionEventTypeEnum.MINIMAL_SOLVE_TIME: {
                detectionEvent = MinimalSolveTimeDetectionEventMapper.fromDTO(dto as MinimalSolveTimeDetectionEventDTO);
                break;
            }
            case DetectionEventDTO.AbstractDetectionEventTypeEnum.NO_COMMANDS: {
                detectionEvent = NoCommandsDetectionEventMapper.fromDTO(dto as NoCommandsDetectionEventDTO);
                break;
            }
            case DetectionEventDTO.AbstractDetectionEventTypeEnum.FORBIDDEN_COMMANDS: {
                detectionEvent = ForbiddenCommandsDetectionEventMapper.fromDTO(
                    dto as ForbiddenCommandsDetectionEventDTO,
                );
                break;
            }
        }
        detectionEvent.trainingInstanceId = dto.training_instance_id;
        detectionEvent.cheatingDetectionId = dto.cheating_detection_id;
        detectionEvent.trainingRunId = dto.training_run_id;
        detectionEvent.id = dto.id;
        detectionEvent.detectedAt = dto.detected_at;
        detectionEvent.levelTitle = dto.level_title;
        detectionEvent.levelId = dto.level_id;
        detectionEvent.levelOrder = dto.level_order;
        detectionEvent.participantCount = dto.participant_count;
        detectionEvent.participants = dto.participants;
        return detectionEvent;
    }

    static fromDTOs(dtos: DetectionEventDTO[]): AbstractDetectionEvent[] {
        return dtos.map((dto) => DetectionEventMapper.fromDTO(dto));
    }
}
