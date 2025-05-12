import { ClusteringVisualizationData, EuclideanDoublePoint } from '@crczp/visualization-model';
import { ClusteringVisualizationDataDTO } from '../dtos';

export class RadarChartDataMapper {
    static fromDTO(dto: ClusteringVisualizationDataDTO | any): ClusteringVisualizationData {
        // TODO refactor the condition?
        if (dto.constructor.name !== 'VisualizationData') {
            const result = new ClusteringVisualizationData();
            result.radarData = [];
            for (const dtoKey in dto) {
                result.radarData.push(dto[dtoKey] as EuclideanDoublePoint);
            }
            return result;
        }
        return dto;
    }
}
