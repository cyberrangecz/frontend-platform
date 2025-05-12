import { TrainingData } from '@crczp/visualization-model';

export class TrainingConfig {
    data: TrainingData;
    currentLevelColor: string;
    eventShapePaths: Record<string, any>;
    time: number;
}
