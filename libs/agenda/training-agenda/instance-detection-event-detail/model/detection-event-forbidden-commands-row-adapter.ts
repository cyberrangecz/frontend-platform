import { DetectedForbiddenCommand } from '@crczp/training-model';

/**
 * Class representing row of cheating detection table
 */
export class DetectionEventForbiddenCommandsRowAdapter extends DetectedForbiddenCommand {
    occurredAtFormatted: string;
    typeFormatted: string;
}
