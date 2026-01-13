import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { ProgressEvent } from '../event/progress/progress-events-model';

export class ProgressVisualizationData {
    startTime: number;
    estimatedEndTime: number;
    currentTime: number;
    levels: ProgressLevelInfo[];
    progress: TraineeProgressData[];
}

export class ProgressLevelInfo {
    id: number;
    title: string;
    maxScore: number;
    levelType: AbstractLevelTypeEnum; //treat as a string enum
    estimatedDuration: number;
    order: number;
    content: string;
    answer: string;
    solution: string;
    solutionPenalized: boolean;
    hints: ProgressHint[];
}

export class ProgressHint {
    id: number;
    title: string;
    content: string;
}

export class TraineeProgressData {
    id: number;
    name: string;
    picture: string;
    trainingRunId: number;
    levels: ProgressLevelVisualizationData[];
}

export type ProgressState = 'RUNNING' | 'COMPLETED';

export class ProgressLevelVisualizationData {
    id: number;
    state: ProgressState;
    startTime: number;
    endTime: number;
    hintsTaken: number[];
    wrongAnswers_number: number;
    events: ProgressEvent[];
    score: number;
}
