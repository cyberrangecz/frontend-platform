import {InfoPhase} from '../../../model/phase/info-phase/info-phase';
import {InfoPhaseDTO} from '../../../dto/phase/info-phase/info-phase-dto';
import {VisualizationPhaseTypeEnum} from '../../../model/enums/visualization-phase-type.enum';
import {InfoPhaseTaskMapper} from './info-phase-task-mapper';

export class InfoPhaseMapper {
    static fromDTO(dto: InfoPhaseDTO): InfoPhase {
        const result = new InfoPhase();
        result.type = VisualizationPhaseTypeEnum.Info;
        result.tasks = [InfoPhaseTaskMapper.fromDTO(dto)];
        return result;
    }
}
