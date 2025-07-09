import {PhaseMapper} from './phase/phase-mapper';
import {TrainingRunDataMapper} from './training-run-data/training-run-data-mapper';
import {TransitionVisualizationData} from '@crczp/visualization-model';
import {AdaptiveVisualizationDataDTO} from '../dto/run-visualization-dto';

export class VisualizationDataMapper {
    static fromDTO(dto: AdaptiveVisualizationDataDTO): TransitionVisualizationData {
        const visualizationData = new TransitionVisualizationData();
        visualizationData.phases = PhaseMapper.fromDTOs(dto.phases);
        visualizationData.trainingRunsData = TrainingRunDataMapper.fromDTOs(dto.training_runs_data);

        return visualizationData;
    }
}
