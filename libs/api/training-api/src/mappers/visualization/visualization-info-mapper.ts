import {AbstractLevelTypeEnum, VisualizationInfo} from '@crczp/training-model';
import {VisualizationInfoDTO} from '../../dto/visualization/visualization-info-dto';
import {LevelMapper} from '../level/level-mapper';

export class VisualizationInfoMapper {
    static fromDTO(dto: VisualizationInfoDTO): VisualizationInfo {
        const res = new VisualizationInfo();
        res.id = dto.id;
        res.levels = LevelMapper.fromDTOs(dto.levels);
        res.levelType = this.resolveLevelType(dto.level_type);
        res.estimatedDuration = dto.estimated_duration;
        res.maxScore = dto.max_score;
        res.order = dto.order;
        res.title = dto.title;
        res.trainingDefinitionEstimatedDuration = dto.training_definition_estimated_duration;
        res.trainingDefinitionId = dto.training_definition_id;
        res.trainingDefinitionTitle = dto.training_definition_title;
        return res;
    }

    private static resolveLevelType(levelType: string) {
        switch (levelType) {
            case 'TRAINING':
                return AbstractLevelTypeEnum.Training;
            case 'INFO':
                return AbstractLevelTypeEnum.Info;
            case 'ASSESSMENT':
                return AbstractLevelTypeEnum.Assessment;
        }
    }
}
