import {AbstractPhaseTypeEnum} from '@crczp/training-model';

export class TransitionTask {
    id!: number;
    order!: number;
}

export abstract class TransitionPhase {
    id!: number;
    title!: string;
    order!: number;
    type!: AbstractPhaseTypeEnum;
    tasks!: TransitionTask[];
}
