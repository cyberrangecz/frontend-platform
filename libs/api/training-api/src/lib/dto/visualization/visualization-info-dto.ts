import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { AbstractLevelDTO } from '../level/abstract-level-dto';

export class VisualizationInfoDTO {
    estimated_duration: number;
    id: number;
    level_type: AbstractLevelTypeEnum;
    max_score: number;
    order: number;
    title: string;
    levels: AbstractLevelDTO[];
    training_definition_estimated_duration: number;
    training_definition_id: number;
    training_definition_title: string;
}
