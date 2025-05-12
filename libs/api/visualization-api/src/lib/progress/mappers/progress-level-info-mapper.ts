import { ProgressHintMapper } from './progress-hint-mapper';
import { ProgressLeveInfoDTO } from '../dtos';
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { ProgressLevelInfo } from '@crczp/visualization-model';

export class ProgressLevelInfoMapper {
    static fromDTOs(dtos: ProgressLeveInfoDTO[]): ProgressLevelInfo[] {
        return dtos.map((dto) => ProgressLevelInfoMapper.fromDTO(dto));
    }

    static fromDTO(dto: ProgressLeveInfoDTO): ProgressLevelInfo {
        const result = new ProgressLevelInfo();
        result.id = dto.id;
        result.content = dto.content;
        result.estimatedDuration = dto.estimated_duration;
        result.answer = dto.answer;
        result.levelType = ProgressLevelInfoMapper.levelTypeResolver(dto.level_type);
        result.maxScore = dto.max_score;
        result.order = dto.order;
        result.solution = dto.solution;
        result.solutionPenalized = dto.solution_penalized;
        result.title = dto.title;
        result.hints = ProgressHintMapper.fromDTOs(dto.hints);
        return result;
    }

    private static levelTypeResolver(levelTypeDTO: string): AbstractLevelTypeEnum {
        switch (levelTypeDTO) {
            case 'INFO_LEVEL':
                return AbstractLevelTypeEnum.Info;
            case 'ASSESSMENT_LEVEL':
                return AbstractLevelTypeEnum.Assessment;
            case 'TRAINING_LEVEL':
                return AbstractLevelTypeEnum.Training;
            case 'ACCESS_LEVEL':
                return AbstractLevelTypeEnum.Access;
        }
    }
}
