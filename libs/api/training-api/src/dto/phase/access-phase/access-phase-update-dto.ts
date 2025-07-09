import {AbstractPhaseDTO} from '../abstract-phase-dto';

export class AccessPhaseUpdateDTO {
    id: number;
    phase_type: AbstractPhaseDTO.PhaseTypeEnum = 'ACCESS';
    passkey: string;
    cloud_content: string;
    local_content: string;
    order: number;
    title: string;
}
