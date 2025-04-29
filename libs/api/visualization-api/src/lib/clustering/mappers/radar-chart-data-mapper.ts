import { ClusteringVisualizationData, EuclideanDoublePoint } from '@crczp/visualization-model';
import { VisualizationDataDTO } from '../dto/visualization-data-dto';

export class RadarChartDataMapper {
    static fromDTO(dto: VisualizationDataDTO | any): ClusteringVisualizationData {
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
