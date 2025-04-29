import { AbstractPhaseTypeEnum } from '../enums/abstract-phase-type.enum';
import { TransitionTask } from './transition-task';

export abstract class TransitionPhase {
    id!: number;
    title!: string;
    order!: number;
    type!: AbstractPhaseTypeEnum;
    tasks!: TransitionTask[];
}
