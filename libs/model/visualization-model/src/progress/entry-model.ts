import {ProgressEvent} from '../event/progress/progress-events-model';

export class CommandLineEntry {
    timestamp: number;
    command: string;
}

export class ProgressDataEntry {
    traineeName: string;
    event: string;
    level: number;
    time: number;
    timestamp: number;
}

export class PlanDataEntry {
    traineeName: string;
    traineeId: number;
}


export class TrainingDataEntry {
    traineeId: number;
    traineeName: string;
    traineeAvatar: string;
    events: ProgressEvent[];
    eventGroups: [];
    answers: number;
    hints: number;
    totalTime: number;
    score: number;
    currentState: string;
    start: number;
    trainingRunId: number;
    teamIndex: number;
}
