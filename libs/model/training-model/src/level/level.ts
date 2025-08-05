/**
 * Parent class of all level types
 */
import { AbstractLevelTypeEnum } from '../enums/abstract-level-type.enum';

export abstract class Level {
    id!: number;
    title!: string;
    order!: number;
    estimatedDuration!: number;
    minimalPossibleSolveTime!: number;
    maxScore!: number;
    valid = true;
    type!: AbstractLevelTypeEnum;
    isUnsaved!: boolean;
}
