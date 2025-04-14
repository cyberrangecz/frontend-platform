import { AbstractLevelTypeEnum } from '../enums/abstract-level-type.enum';
import { Level } from '../level/level';

export class VisualizationInfo {
    estimatedDuration!: number;
    id!: number;
    levelType!: AbstractLevelTypeEnum;
    maxScore!: number;
    order!: number;
    title!: string;
    levels: Level[] = [];
    trainingDefinitionEstimatedDuration!: number;
    trainingDefinitionId!: number;
    trainingDefinitionTitle!: string;
}
