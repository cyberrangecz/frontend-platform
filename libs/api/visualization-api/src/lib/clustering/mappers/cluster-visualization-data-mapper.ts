import { ClusteringVisualizationData } from '@crczp/visualization-model';
import { ClusterDto } from '../dto/cluster-dto';
import { VisualizationDataDTO } from '../dto/visualization-data-dto';

export class ClusterVisualizationDataMapper {
    static fromDTO(dto: VisualizationDataDTO | any): ClusteringVisualizationData {
        const result = new ClusteringVisualizationData();
        result.clusterData = [];
        for (const dtoKey in dto) {
            result.clusterData.push(dto[dtoKey] as ClusterDto);
        }
        return result;
    }
}
