import { TrainingInstanceDTO } from '../dto/training-instance/training-instance-dto';
import { TrainingDefinitionDTO } from '../dto/training-definition/training-definition-dto';
import { TrainingRunDTO } from '../dto/training-run/training-run-dto';
import { UserRefDTO } from '../dto/user/user-ref-dto';
import { CheatingDetectionDTO } from '../dto/cheating-detection/cheating-detection-dto';
import { DetectedForbiddenCommandDTO } from '../dto/detection-event/detected-forbidden-command-dto';
import { DetectionEventParticipantDTO } from '../dto/detection-event/detection-event-participant-dto';
import { AccessedTrainingRunDTO } from '../dto/training-run/accessed-training-run-dto';
import { DetectionEventDTO } from '../dto/detection-event/detection-event-dto';
import { SnakeToCamelCase } from '@crczp/api-common';

export type TrainingInstanceSort = SnakeToCamelCase<keyof TrainingInstanceDTO>;
export type TrainingDefinitionSort = SnakeToCamelCase<
    keyof TrainingDefinitionDTO
>;
export type TrainingRunSort = SnakeToCamelCase<keyof TrainingRunDTO>;
export type AccessedTrainingRunSort = SnakeToCamelCase<
    keyof AccessedTrainingRunDTO
>;
export type UserRefSort = SnakeToCamelCase<keyof UserRefDTO>;
export type CheatingDetectionSort = SnakeToCamelCase<
    keyof CheatingDetectionDTO
>;
export type AbstractDetectionEventSort = SnakeToCamelCase<
    keyof DetectionEventDTO
>;
export type DetectedForbiddenCommandSort = SnakeToCamelCase<
    keyof DetectedForbiddenCommandDTO
>;
export type DetectionEventParticipantSort = SnakeToCamelCase<
    keyof DetectionEventParticipantDTO
>;
