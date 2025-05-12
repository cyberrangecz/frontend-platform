import { FinalResultsDTO } from './final-results-dto';
import { LevelDTO } from './level-dto';

export interface ClusteringVisualizationResourceDTO {
    final_results: FinalResultsDTO;
    levels: LevelDTO[];
}
