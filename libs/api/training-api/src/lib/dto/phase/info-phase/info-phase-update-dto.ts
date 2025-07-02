import {AbstractPhaseDTO} from '../abstract-phase-dto';

export class InfoPhaseUpdateDTO {
    id: number;
    phase_type: AbstractPhaseDTO.PhaseTypeEnum = 'INFO';
    order: number;
    content: string;
    title: string;
}
