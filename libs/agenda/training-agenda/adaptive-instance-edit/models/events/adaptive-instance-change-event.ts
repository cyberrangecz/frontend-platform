import { TrainingInstance } from '@crczp/training-model';

/**
 * Event representing training instance change (edit)
 */
export class AdaptiveInstanceChangeEvent {
    trainingInstance: TrainingInstance;
    isValid: boolean;

    constructor(trainingInstance: TrainingInstance, isValid: boolean) {
        this.trainingInstance = trainingInstance;
        this.isValid = isValid;
    }
}
