import {InfoPhaseDTO} from '../../../dto/phase/info-phase/info-phase-dto';
import {AbstractPhaseTypeEnum} from '@crczp/training-model';
import {InfoPhaseTaskMapper} from './info-phase-task-mapper';
import {InfoTransitionPhase} from '@crczp/visualization-model';


export class InfoPhaseMapper {
    static fromDTO(dto: InfoPhaseDTO): InfoTransitionPhase {
        const result = new InfoTransitionPhase();
        result.type = AbstractPhaseTypeEnum.Info;
        result.tasks = [InfoPhaseTaskMapper.fromDTO(dto)];
        return result;
    }
}
