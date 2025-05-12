import { TrainingPhaseDTO } from '../../../dto/phase/training-phase/training-phase-dto';
import { TrainingPhaseTaskMapper } from './training-phase-task-mapper';
import { TrainingTransitionPhase } from '@crczp/visualization-model';
import { AbstractPhaseTypeEnum } from '@crczp/training-model';

export class TrainingPhaseMapper {
    static fromDTO(dto: TrainingPhaseDTO): TrainingTransitionPhase {
        const result = new TrainingTransitionPhase();
        result.type = AbstractPhaseTypeEnum.Training;
        result.allowedCommands = dto.allowed_commands;
        result.allowedWrongAnswers = dto.allowed_wrong_answers;
        result.estimatedDuration = dto.estimated_duration;
        result.tasks = TrainingPhaseTaskMapper.fromDTOs(dto.tasks);
        return result;
    }
}
