import { TrainingRunPathNode } from './training-run-path-node';
import { Trainee } from '@crczp/training-model';

export class TrainingRunData {
    trainingRunId!: number;
    trainee!: Trainee;
    trainingRunPathNodes!: TrainingRunPathNode[];
    localEnvironment!: boolean;
}
