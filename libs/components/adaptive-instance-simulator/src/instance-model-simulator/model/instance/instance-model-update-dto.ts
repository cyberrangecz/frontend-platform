import { AbstractPhaseDTO } from '@crczp/training-api';

export class InstanceModelUpdateDTO {
    cache_id: string;
    phases: AbstractPhaseDTO[];
}
