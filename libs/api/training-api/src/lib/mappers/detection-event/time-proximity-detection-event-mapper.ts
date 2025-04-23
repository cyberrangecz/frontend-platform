import { AbstractDetectionEventTypeEnum, TimeProximityDetectionEvent } from '@crczp/training-model';
import { TimeProximityDetectionEventDTO } from '../../dto/detection-event/time-proximity/time_proximity-detection-event-dto';

export class TimeProximityDetectionEventMapper {
    static fromDTO(dto: TimeProximityDetectionEventDTO): TimeProximityDetectionEvent {
        const result = new TimeProximityDetectionEvent();
        result.threshold = dto.threshold;
        result.detectionEventType = AbstractDetectionEventTypeEnum.Time_proximity;
        return result;
    }
}
