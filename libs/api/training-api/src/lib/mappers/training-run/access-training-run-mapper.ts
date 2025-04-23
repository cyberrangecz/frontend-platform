import { AccessTrainingRunInfo, TrainingLevel } from '@crczp/training-model';
import { AbstractLevelDTO } from '../../dto/level/abstract-level-dto';
import { AccessTrainingRunDTO } from '../../dto/training-run/access-training-run-dto';
import { LevelMapper } from '../level/level-mapper';
import LevelTypeEnum = AbstractLevelDTO.LevelTypeEnum;

export class AccessTrainingRunMapper {
    static fromDTO(dto: AccessTrainingRunDTO): AccessTrainingRunInfo {
        const result = new AccessTrainingRunInfo();
        result.trainingRunId = dto.training_run_id;
        result.sandboxInstanceId = dto.sandbox_instance_ref_id;
        result.sandboxDefinitionId = dto.sandbox_definition_id;
        result.localEnvironment = dto.local_environment;
        result.backwardMode = dto.backward_mode;
        result.startTime = new Date(dto.start_time);
        result.isStepperDisplayed = dto.show_stepper_bar;
        result.isLevelAnswered = dto.level_answered;
        result.currentLevel = LevelMapper.fromDTO(dto.abstract_level_dto);
        result.levels = LevelMapper.fromBasicDTOs(dto.info_about_levels);

        if (dto.taken_solution && dto.abstract_level_dto.level_type === LevelTypeEnum.TRAINING) {
            (result.currentLevel as TrainingLevel).solution = dto.taken_solution;
        }
        if (
            dto.taken_hints &&
            dto.taken_hints.length > 0 &&
            dto.abstract_level_dto.level_type === LevelTypeEnum.TRAINING
        ) {
            dto.taken_hints.forEach((takenHint) => {
                const matchingHint = (result.currentLevel as TrainingLevel).hints.find(
                    (hint) => hint.id === takenHint.id,
                );
                if (matchingHint) {
                    matchingHint.content = takenHint.content;
                }
            });
        }
        return result;
    }
}
