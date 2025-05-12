import { ClusteringVisualizationData } from '@crczp/visualization-model';
import { ClusterDto, ClusteringVisualizationDataDTO } from '../dtos';

export class ClusterVisualizationDataMapper {
    static fromDTO(dto: ClusteringVisualizationDataDTO | any): ClusteringVisualizationData {
        const result = new ClusteringVisualizationData();
        result.clusterData = [];
        for (const dtoKey in dto) {
            result.clusterData.push(dto[dtoKey] as ClusterDto);
        }
        return result;
    }
}
