export class ClusteredUser {
    userRefId: number;
    clusterId: number;
}

export enum Clusterables {
    WrongFlags,
    TimeAfterHint,
    NDimensional,
}

export class UserClustering {
    points: ClusteredUser[];
    center: ClusteredUser[];
}

export class EuclideanDoublePoint {
    points: number[][];
    center: number[];
}

export class ClusteringVisualizationData {
    radarData?: EuclideanDoublePoint[];
    clusterData?: UserClustering[];
}

export class SseData {
    [index: number]: number;
}

export class TrainingDataset {
    playerId: number;
    events: Event[];
    eventsGroups: any;
    totalTime: number;
}

export class WrongFlags extends ClusteredUser {
    wrongFlagsSubmitted: number;
    timePlayed: number;
    wrongFlagsSubmittedNormalized: number;
    timePlayedNormalized: number;
}

export interface TimeAfterHint extends ClusteredUser {
    level: number;
    timeSpentAfterHint: number;
    wrongFlagsAfterHint: number;
    timeSpentAfterHintNormalized: number;
    wrongFlagsAfterHintNormalized: number;
}


export class EventIdentification {
    sandboxId = '';
    trainingInstanceId = '';
    trainingDefinitionId = '';
    trainingRunId = '';
}
