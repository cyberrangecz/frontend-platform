/**
 * Class representing cheating detection on training instance
 */
import { CheatingDetectionStateEnum } from '../enums/cheating-detection-state.enum';
import { ForbiddenCommand } from './detection-events/forbidden-command';

export class CheatingDetection {
    trainingInstanceId!: number;
    executedBy!: string;
    executeTime!: Date;
    proximityThreshold?: number;
    id!: number;
    currentState!: CheatingDetectionStateEnum;
    results!: number;
    answerSimilarityState!: CheatingDetectionStateEnum;
    locationSimilarityState!: CheatingDetectionStateEnum;
    timeProximityState!: CheatingDetectionStateEnum;
    minimalSolveTimeState!: CheatingDetectionStateEnum;
    noCommandsState!: CheatingDetectionStateEnum;
    forbiddenCommandsState!: CheatingDetectionStateEnum;
    forbiddenCommands?: ForbiddenCommand[];
}
