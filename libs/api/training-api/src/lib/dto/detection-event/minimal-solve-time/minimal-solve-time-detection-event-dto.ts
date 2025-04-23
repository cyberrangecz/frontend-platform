import { DetectionEventDTO } from '../detection-event-dto';

export interface MinimalSolveTimeDetectionEventDTO extends DetectionEventDTO {
    minimal_solve_time: number;
}
