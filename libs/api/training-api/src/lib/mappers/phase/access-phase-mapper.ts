import { AbstractPhaseTypeEnum, AccessPhase } from '@crczp/training-model';
import { AccessPhaseDTO } from '../../dto/phase/access-phase/access-phase-dto';
import { AccessPhaseUpdateDTO } from '../../dto/phase/access-phase/access-phase-update-dto';

export class AccessPhaseMapper {
    static fromDTO(dto: AccessPhaseDTO): AccessPhase {
        const result = new AccessPhase();
        result.type = AbstractPhaseTypeEnum.Access;
        result.passkey = dto.passkey;
        result.cloudContent = dto.cloud_content;
        result.localContent = dto.local_content;
        return result;
    }

    static toUpdateDTO(phase: AccessPhase): AccessPhaseUpdateDTO {
        const result = new AccessPhaseUpdateDTO();
        result.id = phase.id;
        result.order = phase.order;
        result.title = phase.title;
        result.passkey = phase.passkey;
        result.cloud_content = phase.cloudContent;
        result.local_content = phase.localContent;
        return result;
    }
}
