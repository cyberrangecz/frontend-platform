import {Phase} from '@crczp/training-model';
import {AbstractPhaseDTO} from '../../../dto/phase/abstract-phase-dto';
import {AccessPhaseDTO} from '../../../dto/phase/access-phase/access-phase-dto';
import {InfoPhaseDTO} from '../../../dto/phase/info-phase/info-phase-dto';
import {TrainingPhaseDTO} from '../../../dto/phase/training-phase/training-phase-dto';
import {
    AnsweredQuestionnairePhaseDTO
} from '../../../dto/training-run/adaptive-run-phases/answered-questionnaire-phase-dto';
import {AccessPhaseMapper} from '../../phase/access-phase-mapper';
import {InfoPhaseMapper} from '../../phase/info-phase-mapper';
import {TrainingPhaseMapper} from '../../phase/training-phase-mapper';
import {AnsweredQuestionnairePhaseMapper} from './questionnaire/answered-questionnaire-phase-mapper';

/**
 * @dynamic
 */
export class AnsweredPhaseMapper {
    static fromDTO(dto: AbstractPhaseDTO): Phase {
        let phase: Phase;
        switch (dto.phase_type) {
            case AbstractPhaseDTO.PhaseTypeEnum.TRAINING: {
                phase = TrainingPhaseMapper.fromDTO(dto as TrainingPhaseDTO);
                break;
            }
            case AbstractPhaseDTO.PhaseTypeEnum.INFO: {
                phase = InfoPhaseMapper.fromDTO(dto as InfoPhaseDTO);
                break;
            }
            case AbstractPhaseDTO.PhaseTypeEnum.QUESTIONNAIRE: {
                phase = AnsweredQuestionnairePhaseMapper.fromDTO(dto as AnsweredQuestionnairePhaseDTO);
                break;
            }
            case AbstractPhaseDTO.PhaseTypeEnum.ACCESS: {
                phase = AccessPhaseMapper.fromDTO(dto as AccessPhaseDTO);
                break;
            }
        }
        phase.id = dto.id;
        phase.title = dto.title;
        phase.order = dto.order;
        return phase;
    }

    static fromDTOs(dtos: AbstractPhaseDTO[]): Phase[] {
        return dtos.map((dto) => AnsweredPhaseMapper.fromDTO(dto)).sort((a, b) => a.order - b.order);
    }
}
