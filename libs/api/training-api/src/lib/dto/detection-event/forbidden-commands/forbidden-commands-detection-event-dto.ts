import { DetectionEventDTO } from '../detection-event-dto';

export interface ForbiddenCommandsDetectionEventDTO extends DetectionEventDTO {
    command_count: number;
}
