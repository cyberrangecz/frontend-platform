import {AccessTrainingRunInfo, TrainingPhase} from '@crczp/training-model';
import {AccessTrainingRunDTO} from '../../dto/training-run/access-training-run-dto';
import {PhaseMapper} from '../phase/phase-mapper';
import {AbstractPhaseDTO} from '../../dto/phase/abstract-phase-dto';
import PhaseTypeEnum = AbstractPhaseDTO.PhaseTypeEnum;

export class AccessAdaptiveRunMapper {
    static fromDTO(dto: AccessTrainingRunDTO): AccessTrainingRunInfo {
        const result = new AccessTrainingRunInfo();
        result.trainingRunId = dto.training_run_id;
        result.sandboxInstanceId = dto.sandbox_instance_ref_id;
        result.sandboxDefinitionId = dto.sandbox_definition_id;
        result.localEnvironment = dto.local_environment;
        result.backwardMode = dto.backward_mode;
        result.startTime = new Date(dto.start_time);
        result.isLevelAnswered = dto.phase_answered;
        result.currentLevel = PhaseMapper.fromDTO(dto.current_phase);
        result.levels = PhaseMapper.fromBasicDTOs(dto.info_about_phases);

        if (dto.taken_solution && dto.current_phase.phase_type === PhaseTypeEnum.TRAINING) {
            (result.currentLevel as TrainingPhase).currentTask.solution = dto.taken_solution;
        }
        return result;
    }
}
