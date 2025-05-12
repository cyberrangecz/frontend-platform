import { ClusteredUser, EuclideanDoublePoint, UserClustering } from '@crczp/visualization-model';

export class ClusterDto {
    points: ClusteredUser[];
    center: ClusteredUser[];
}

export class ClusteringVisualizationDataDTO {
    [index: number | string]: UserClustering | EuclideanDoublePoint;
}

export class SseDTO {
    [index: number | string]: number;
}
