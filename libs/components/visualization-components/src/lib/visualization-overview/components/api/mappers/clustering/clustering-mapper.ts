import { ClusteringVisualizationResourceDTO } from '../../dto/clustering/clustering-visualization-resource-dto';
import { ClusteringTrainingData } from '../../../model/clustering/clustering-training-data';
import { LevelMapper } from './level-mapper';
import { FinalResults } from '../../../model/clustering/final-results';
import { PlayerDataMapper } from './player-data-mapper';

export class ClusteringMapper {
    static fromDTO(dto: ClusteringVisualizationResourceDTO): ClusteringTrainingData {
        const result = new ClusteringTrainingData();

        result.finalResults = new FinalResults();
        result.finalResults.maxParticipantAssessmentScore = dto.final_results.max_participant_assessment_score;
        result.finalResults.maxParticipantTrainingScore = dto.final_results.max_participant_training_score;
        result.finalResults.maxParticipantScore = dto.final_results.max_participant_score;
        result.finalResults.maxAchievableScore = dto.final_results.max_achievable_score;
        result.finalResults.averageScore = dto.final_results.average_score;
        result.finalResults.maxParticipantTime = dto.final_results.max_participant_time / 1000;
        result.finalResults.averageTime = dto.final_results.average_time / 1000;
        result.finalResults.estimatedTime = dto.final_results.estimated_time / 1000;
        result.finalResults.playerData = PlayerDataMapper.fromDTOs(dto.final_results.player_data);
        result.levels = LevelMapper.fromDTOs(dto.levels);

        return result;
    }
}
