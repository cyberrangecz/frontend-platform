import {TrainingUser} from '@crczp/training-model';

export class Graph {
    graph: string;
}

export class CommandTrainingRun {
    id: number;
    state: string;
    sandboxInstanceRefId: number;
    participantRef: TrainingUser;
}

export class CommandPerOptions {
    cmd: string;
    commandType: string;
    options: string;
    mistake: string;
    fromHostIp: string;
    frequency: number;
}

export class AggregatedCommands {
    cmd: string;
    commandType: string;
    frequency: number;
    commandPerOptions: CommandPerOptions[];
}

export class VisualizationCommand {
    timestamp: string;
    trainingTime: string;
    fromHostIp: string;
    options: string;
    commandType: string;
    cmd: string;
    isForbidden?: boolean;
}


export enum DetectedForbiddenCommandTypeEnum {
    Bash = 'BASH',
    Msf = 'MSF',
}

export class DetectedForbiddenCommand {
    command: string;
    type: DetectedForbiddenCommandTypeEnum;
    hostname: string;
    occurredAt: Date;
}


