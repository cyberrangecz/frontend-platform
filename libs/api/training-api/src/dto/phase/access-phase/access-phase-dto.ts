import {AbstractPhaseDTO} from '../abstract-phase-dto';

export interface AccessPhaseDTO extends AbstractPhaseDTO {
    passkey: string;
    cloud_content: string;
    local_content: string;
}
