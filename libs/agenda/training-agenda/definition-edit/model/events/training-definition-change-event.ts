import {TrainingDefinitionWithLevels} from '@crczp/training-model';

/**
 * Event representing training definition change (edit)
 */
export class TrainingDefinitionChangeEvent {
    trainingDefinition: TrainingDefinitionWithLevels;
    isValid: boolean;

    constructor(trainingDefinition: TrainingDefinitionWithLevels, isValid: boolean) {
        this.trainingDefinition = trainingDefinition;
        this.isValid = isValid;
    }
}
