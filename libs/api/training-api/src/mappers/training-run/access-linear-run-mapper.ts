import { AccessTrainingRunInfo, TrainingLevel } from '@crczp/training-model';
import { AbstractLevelDTO } from '../../dto/level/abstract-level-dto';
import { AccessTrainingRunDTO } from '../../dto/training-run/access-training-run-dto';
import { LevelMapper } from '../level/level-mapper';
import LevelTypeEnum = AbstractLevelDTO.LevelTypeEnum;

export class AccessLinearRunMapper {
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
        if (!dto.abstract_level_dto) {
            result.currentLevelId = 0;
            result.displayedLevelId = 0;
            return result;
        }
        const currentLevel = LevelMapper.fromDTO(dto.abstract_level_dto);
        result.localEnvironment = dto.local_environment;
        result.backwardMode = dto.backward_mode;
        result.startTime = new Date(dto.start_time);
        result.isStepperDisplayed = dto.show_stepper_bar;
        result.isCurrentLevelAnswered = dto.level_answered;
        result.currentLevelId = currentLevel.id;
        result.displayedLevelId = result.currentLevelId;
        result.levels = LevelMapper.fromBasicDTOs(dto.info_about_levels ?? []);

        if (
            dto.taken_solution &&
            dto.abstract_level_dto?.level_type === LevelTypeEnum.TRAINING
        ) {
            (currentLevel as TrainingLevel).solution = dto.taken_solution;
        }
        if (
            dto.taken_hints &&
            dto.taken_hints.length > 0 &&
            dto.abstract_level_dto?.level_type === LevelTypeEnum.TRAINING
        ) {
            (currentLevel as TrainingLevel).hints = (
                currentLevel as TrainingLevel
            ).hints.map((hint) => {
                const takenHint = dto.taken_hints.find(
                    (th) => th.id === hint.id,
                );
                if (takenHint) {
                    hint.content = takenHint.content;
                }
                return hint;
            });
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
