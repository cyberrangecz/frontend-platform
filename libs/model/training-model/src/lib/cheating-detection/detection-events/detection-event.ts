/**
 * Parent class of all detection events
 */
import { AbstractDetectionEventTypeEnum } from '../../enums/abstract-detection-event-type.enum';

export class AbstractDetectionEvent {
    id!: number;
    trainingRunId!: number;
    trainingInstanceId!: number;
    cheatingDetectionId!: number;
    detectionEventType!: AbstractDetectionEventTypeEnum;
    detectedAt!: Date;
    levelTitle!: string;
    levelId!: number;
    levelOrder!: number;
    participantCount!: number;
    participants!: string;
}
