import { AccessTrainingRunInfo, TrainingLevel } from '@crczp/training-model';
import { AbstractLevelDTO } from '../../dto/level/abstract-level-dto';
import { AccessTrainingRunDTO } from '../../dto/training-run/access-training-run-dto';
import { LevelMapper } from '../level/level-mapper';
import LevelTypeEnum = AbstractLevelDTO.LevelTypeEnum;

export class AccessLinearRunMapper {
    static fromDTO(dto: AccessTrainingRunDTO): AccessTrainingRunInfo {
        const result = new AccessTrainingRunInfo();
        const currentLevel = LevelMapper.fromDTO(dto.abstract_level_dto);

        result.trainingRunId = dto.training_run_id;
        result.sandboxInstanceId = dto.sandbox_instance_ref_id;
        result.sandboxDefinitionId = dto.sandbox_definition_id;
        result.localEnvironment = dto.local_environment;
        result.backwardMode = dto.backward_mode;
        result.startTime = new Date(dto.start_time);
        result.isStepperDisplayed = dto.show_stepper_bar;
        result.isCurrentLevelAnswered = dto.level_answered;
        result.currentLevelId = currentLevel.id;
        result.displayedLevelId = result.currentLevelId;
        result.levels = LevelMapper.fromBasicDTOs(dto.info_about_levels);

        if (
            dto.taken_solution &&
            dto.abstract_level_dto.level_type === LevelTypeEnum.TRAINING
        ) {
            (currentLevel as TrainingLevel).solution = dto.taken_solution;
        }
        if (
            dto.taken_hints &&
            dto.taken_hints.length > 0 &&
            dto.abstract_level_dto.level_type === LevelTypeEnum.TRAINING
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
