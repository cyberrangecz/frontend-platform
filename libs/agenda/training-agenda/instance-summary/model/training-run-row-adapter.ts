import { TrainingDefinition, TrainingRun } from '@crczp/training-model';

/**
 * Class representing row of training run table
 */
export class TrainingRunRowAdapter extends TrainingRun {
    playerName: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    duration: string;
    trainingDefinition: TrainingDefinition;
}
