import { AccessPhaseTaskMapper } from './access-phase-task-mapper';
import { AccessPhaseDTO } from '../../../dto/phase/access-phase/access-phase-dto';
import { AccessTransitionPhase } from '@crczp/visualization-model';
import { AbstractPhaseTypeEnum } from '@crczp/training-model';

export class AccessPhaseMapper {
    static fromDTO(dto: AccessPhaseDTO): AccessTransitionPhase {
        const result = new AccessTransitionPhase();
        result.type = AbstractPhaseTypeEnum.Access;
        result.tasks = [AccessPhaseTaskMapper.fromDTO(dto)];
        return result;
    }
}
