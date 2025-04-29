import { EuclideanDoublePoint, UserClustering } from '@crczp/visualization-model';

export class VisualizationDataDTO {
    [index: number | string]: UserClustering | EuclideanDoublePoint;
}
