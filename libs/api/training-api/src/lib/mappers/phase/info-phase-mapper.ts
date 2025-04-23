import { InfoPhaseDTO } from '../../dto/phase/info-phase/info-phase-dto';
import { AbstractPhaseTypeEnum, InfoPhase } from '@crczp/training-model';
import { InfoPhaseUpdateDTO } from '../../dto/phase/info-phase/info-phase-update-dto';

export class InfoPhaseMapper {
    static fromDTO(dto: InfoPhaseDTO): InfoPhase {
        const result = new InfoPhase();
        result.type = AbstractPhaseTypeEnum.Info;
        result.content = dto.content;
        return result;
    }

    static toUpdateDTO(phase: InfoPhase): InfoPhaseUpdateDTO {
        const result = new InfoPhaseUpdateDTO();
        result.id = phase.id;
        result.order = phase.order;
        result.title = phase.title;
        result.content = phase.content;
        return result;
    }
}
