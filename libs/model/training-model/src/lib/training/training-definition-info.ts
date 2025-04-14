import { TrainingDefinitionStateEnum } from '../enums/training-definition-state.enum';

/**
 * Class containing basic info about training definition
 */
export class TrainingDefinitionInfo {
    id!: number;
    title!: string;
    state!: TrainingDefinitionStateEnum;
}
