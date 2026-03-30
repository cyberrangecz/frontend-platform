import { AccessTrainingRunInfo, TrainingPhase } from '@crczp/training-model';
import { AccessTrainingRunDTO } from '../../dto/training-run/access-training-run-dto';
import { PhaseMapper } from '../phase/phase-mapper';
import { AbstractPhaseDTO } from '../../dto/phase/abstract-phase-dto';
import PhaseTypeEnum = AbstractPhaseDTO.PhaseTypeEnum;

export class AccessAdaptiveRunMapper {
    static fromDTO(dto: AccessTrainingRunDTO): AccessTrainingRunInfo {
        const result = new AccessTrainingRunInfo();
        result.trainingRunId = dto.training_run_id;
        result.instanceId = dto.instance_id;
        result.trainingInstanceTitle = dto.training_instance_title;
        result.allowAllocate = dto.allow_allocate !== false;
        result.managed = dto.managed ?? false;
        result.accessToken = dto.access_token ?? undefined;
        result.activeSandboxes = dto.active_sandboxes?.map((s) => ({
            id: s.id,
            poolId: s.pool_id,
            createdAt: s.created_at,
            createdBySub: s.created_by_sub,
            sandboxId: s.sandbox_id ?? null,
            allocationRequest: s.allocation_request
                ? {
                      id: s.allocation_request.id,
                      allocationUnitId: s.allocation_request.allocation_unit_id,
                      stages: s.allocation_request.stages ?? [],
                  }
                : undefined,
            cleanupRequest: s.cleanup_request
                ? {
                      id: s.cleanup_request.id,
                      allocationUnitId: s.cleanup_request.allocation_unit_id,
                      stages: s.cleanup_request.stages ?? [],
                  }
                : undefined,
            allowRemove: s.allow_remove ?? false,
            trainingInstanceTitle: s.training_instance_title ?? null,
            trainingInstanceId: s.training_instance_id ?? null,
            managed: s.training_instance_managed ?? false,
        }));
        result.sandboxInstanceId = dto.sandbox_instance_ref_id;
        result.sandboxDefinitionId = dto.sandbox_definition_id;
        if (!dto.current_phase) {
            result.currentLevelId = 0;
            result.displayedLevelId = 0;
            return result;
        }
        const currentLevel = PhaseMapper.fromDTO(dto.current_phase);
        result.localEnvironment = dto.local_environment;
        result.backwardMode = dto.backward_mode;
        result.startTime = dto.start_time ? new Date(dto.start_time) : new Date();
        result.isCurrentLevelAnswered = dto.phase_answered;
        result.currentLevelId = currentLevel.id;
        result.displayedLevelId = result.currentLevelId;
        result.levels = PhaseMapper.fromBasicDTOs(dto.info_about_phases ?? []);

        if (
            dto.taken_solution &&
            dto.current_phase.phase_type === PhaseTypeEnum.TRAINING
        ) {
            (result.currentLevel as TrainingPhase).currentTask.solution =
                dto.taken_solution;
        }
        result.levels = result.levels.map((level) => {
            if (level.id === currentLevel.id) {
                return currentLevel;
            }
            return level;
        });

        return result;
    }
}
