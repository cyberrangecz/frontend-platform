import {AbstractPhaseDTO} from '../../dto/phase/abstract-phase-dto';
import {
    AbstractPhaseTypeEnum,
    AccessPhase,
    AdaptiveTask,
    InfoPhase,
    Phase,
    QuestionnairePhase,
    TrainingPhase,
} from '@crczp/training-model';
import {TrainingPhaseMapper} from './training-phase-mapper';
import {TrainingPhaseDTO} from '../../dto/phase/training-phase/training-phase-dto';
import {InfoPhaseMapper} from './info-phase-mapper';
import {InfoPhaseDTO} from '../../dto/phase/info-phase/info-phase-dto';
import {QuestionnairePhaseMapper} from './questionnaire-phase-mapper';
import {QuestionnairePhaseDTO} from '../../dto/phase/questionnaire-phase/questionnaire-phase-dto';
import {BasicPhaseInfoDTO} from '../../dto/phase/basic-phase-info-dto';
import {TrainingPhaseUpdateDTO} from '../../dto/phase/training-phase/training-phase-update-dto';
import {InfoPhaseUpdateDTO} from '../../dto/phase/info-phase/info-phase-update-dto';
import {QuestionnairePhaseUpdateDTO} from '../../dto/phase/questionnaire-phase/questionnaire-phase-update-dto';
import {AccessPhaseUpdateDTO} from '../../dto/phase/access-phase/access-phase-update-dto';
import {AccessPhaseMapper} from './access-phase-mapper';
import {AccessPhaseDTO} from '../../dto/phase/access-phase/access-phase-dto';

/**
 * @dynamic
 */
export class PhaseMapper {
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
                phase = QuestionnairePhaseMapper.fromDTO(dto as QuestionnairePhaseDTO);
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
        return dtos.map((dto) => PhaseMapper.fromDTO(dto)).sort((a, b) => a.order - b.order);
    }

    static fromBasicDTO(dto: BasicPhaseInfoDTO): Phase {
        let phase: Phase;
        switch (dto.phase_type) {
            case BasicPhaseInfoDTO.PhaseTypeEnum.INFO: {
                phase = new InfoPhase();
                phase.type = AbstractPhaseTypeEnum.Info;
                break;
            }
            case BasicPhaseInfoDTO.PhaseTypeEnum.TRAINING: {
                phase = new TrainingPhase();
                phase.type = AbstractPhaseTypeEnum.Training;
                break;
            }
            case BasicPhaseInfoDTO.PhaseTypeEnum.TASK: {
                phase = new AdaptiveTask();
                phase.type = AbstractPhaseTypeEnum.Task;
                break;
            }
            case BasicPhaseInfoDTO.PhaseTypeEnum.QUESTIONNAIRE: {
                phase = new QuestionnairePhase();
                phase.type = AbstractPhaseTypeEnum.Questionnaire;
                break;
            }
            case BasicPhaseInfoDTO.PhaseTypeEnum.ACCESS: {
                phase = new AccessPhase();
                phase.type = AbstractPhaseTypeEnum.Access;
                break;
            }
        }
        phase.id = dto.id;
        phase.title = dto.title;
        phase.order = dto.order;
        return phase;
    }

    static fromBasicDTOs(dtos: BasicPhaseInfoDTO[]): Phase[] {
        return dtos.map((dto) => this.fromBasicDTO(dto));
    }

    static toUpdateDTOs(phases: Phase[]): AbstractPhaseDTO[] {
        return phases.map((phase) => this.toUpdateDTO(phase));
    }

    static toUpdateDTO(phase: Phase): AbstractPhaseDTO {
        let phaseDTO: AbstractPhaseDTO;
        switch (phase.type) {
            case AbstractPhaseTypeEnum.Training: {
                phaseDTO = new TrainingPhaseUpdateDTO();
                phaseDTO = TrainingPhaseMapper.toUpdateDTO(phase as TrainingPhase);
                break;
            }
            case AbstractPhaseTypeEnum.Access: {
                phaseDTO = new AccessPhaseUpdateDTO();
                phaseDTO = AccessPhaseMapper.toUpdateDTO(phase as AccessPhase);
                break;
            }
            case AbstractPhaseTypeEnum.Info: {
                phaseDTO = new InfoPhaseUpdateDTO();
                phaseDTO = InfoPhaseMapper.toUpdateDTO(phase as InfoPhase);
                break;
            }
            case AbstractPhaseTypeEnum.Questionnaire: {
                phaseDTO = new QuestionnairePhaseUpdateDTO();
                phaseDTO = QuestionnairePhaseMapper.mapQuestionnaireToUpdateDTO(phase as QuestionnairePhase);
                break;
            }
        }
        return phaseDTO;
    }
}
