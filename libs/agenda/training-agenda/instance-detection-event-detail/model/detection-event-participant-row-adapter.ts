import { DetectionEventParticipant } from '@crczp/training-model';

/**
 * Class representing row of cheating detection table
 */
export class DetectionEventParticipantRowAdapter extends DetectionEventParticipant {
    occurredAtFormatted: string;
    solvedInTimeFormatted: string;
}
