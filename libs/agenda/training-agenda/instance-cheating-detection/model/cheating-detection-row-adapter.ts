import { CheatingDetection } from '@crczp/training-model';

/**
 * Class representing row of cheating detection table
 */
export class CheatingDetectionRowAdapter extends CheatingDetection {
    resultsFormatted: string;
    executeTimeFormatted: string;
    stages: string[];
}
