import { AbstractDetectionEvent } from '@crczp/training-model';

/**
 * Class representing row of cheating detection table
 */
export class DetectionEventRowAdapter extends AbstractDetectionEvent {
    detectedAtFormatted: string;
    detectionEventTypeFormatted: string;
}
