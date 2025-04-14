import { AbstractPhaseTypeEnum } from '../enums/abstract-phase-type.enum';

export abstract class Phase {
    id!: number;
    title!: string;
    order!: number;
    type!: AbstractPhaseTypeEnum;
    isUnsaved!: boolean;
    valid: boolean = true;

}
