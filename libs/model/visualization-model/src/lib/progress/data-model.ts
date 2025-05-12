import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { TrainingDataEntry } from './entry-model';
import { ProgressEvent } from '../event/progress/progress-events-model';

export class ProgressVisualizationData {
    startTime: number;
    estimatedEndTime: number;
    currentTime: number;
    trainees: ProgressTraineeInfo[];
    levels: ProgressLevelInfo[];
    traineeProgress: TraineeProgressData[];
}

export class LevelTimelineData {
    timestamp: number;
    value: string;
    icon: string;
    color: string;
}

export class ProgressLevelVisualizationData {
    id: number;
    state: string;
    startTime: number;
    endTime: number;
    hintsTaken: number[];
    wrongAnswers_number: number;
    events: ProgressEvent[];
    score: number;
}

export class ProgressLevelInfo {
    id: number;
    title: string;
    maxScore: number;
    levelType: AbstractLevelTypeEnum;
    estimatedDuration: number;
    order: number;
    content: string;
    answer: string;
    solution: string;
    solutionPenalized: boolean;
    hints: ProgressHint[];
}

export class TrainingData {
    time: number;
    levels: object[];
    keys?: string[];
    trainingDataSet?: object[];
    planDataSet?: object[];
    levelsTimePlan?: number[];
    teams?: TrainingDataEntry[];
    participants?: ProgressTraineeInfo[];
}

export class TrainingRunDataset {
    traineeId: number;
    events: ProgressEvent[];
    eventsGroups: any;
    totalTime: number;
}

export class TrainingVisualizationData {
    id: string;
    name: string;
    levels: ProgressLevelInfo[];
}

export class ProgressHint {
    id: number;
    title: string;
    content: string;
}

export interface ProgressData {
    firstEvent: TrainingRunDataset;
    estimatedDuration: number;
    lastEvent: TrainingRunDataset;
}


export class TraineeSelectData {
    trainee: ProgressTraineeInfo;
    isActive: boolean;
    isSelected: boolean;
    warnings: WarningData;
    fadedWarnings: WarningData;
}

export class WrongAnswerData {
    value: string;
    timesUsed: number;
    lastUsed: string;
}

export class TrainingTimeOverviewData {
    start: number;
    end: number;
    levelId: number;
}

export class WarningData {
    wrongAnswerWarning: boolean;
    hintWarning: boolean;
    tooLongWarning: boolean;
}

export class ProgressTraineeInfo {
    userRefId: number;
    trainingRunId: number;
    name: string;
    picture: string;
    teamIndex: number;
}


export class TraineeProgressData {
    userRefId: number;
    trainingRunId: number;
    displayRun: boolean;
    levels: ProgressLevelVisualizationData[];
}

export class PreparedData {
    trainingDataSet: Record<string, number>[];
    planDataSet: object[];
}
