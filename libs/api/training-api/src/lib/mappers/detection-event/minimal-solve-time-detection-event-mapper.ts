import { AbstractDetectionEventTypeEnum, MinimalSolveTimeDetectionEvent } from '@crczp/training-model';
import { MinimalSolveTimeDetectionEventDTO } from '../../dto/detection-event/minimal-solve-time/minimal-solve-time-detection-event-dto';

export class MinimalSolveTimeDetectionEventMapper {
    static fromDTO(dto: MinimalSolveTimeDetectionEventDTO): MinimalSolveTimeDetectionEvent {
        const result = new MinimalSolveTimeDetectionEvent();
        result.minimalSolveTime = dto.minimal_solve_time;
        result.detectionEventType = AbstractDetectionEventTypeEnum.Minimal_solve_time;
        return result;
    }
}
