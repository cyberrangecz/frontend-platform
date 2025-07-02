/**
 * Class representing row of accessed training run table
 */
import {TraineeAccessTrainingRunActionEnum} from '../enums/trainee-access-training-run-actions.enum';
import {TrainingRunTypeEnum} from '../enums/training-run-type-enum';

export class AccessedTrainingRun {
    totalLevels!: number;
    currentLevel!: number;
    completedLevels!: string;
    trainingRunId!: number;
    action!: TraineeAccessTrainingRunActionEnum;
    trainingInstanceTitle!: string;
    trainingInstanceFormattedDuration!: string;
    trainingInstanceStartTime!: Date;
    trainingInstanceEndTime!: Date;
    type!: TrainingRunTypeEnum;
    localEnvironment!: boolean;
    sandboxDefinitionId!: number;
}
