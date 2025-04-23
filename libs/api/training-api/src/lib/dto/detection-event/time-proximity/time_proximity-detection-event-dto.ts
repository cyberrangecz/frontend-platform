import { DetectionEventDTO } from '../detection-event-dto';

export interface TimeProximityDetectionEventDTO extends DetectionEventDTO {
    threshold: number;
}
