import {VisualizationPhaseTypeEnum} from '../../../model/enums/visualization-phase-type.enum';
import {TrainingPhaseDTO} from '../../../dto/phase/training-phase/training-phase-dto';
import {TrainingPhase} from '../../../model/phase/training-phase/training-phase';
import {TrainingPhaseTaskMapper} from './training-phase-task-mapper';

export class TrainingPhaseMapper {
    static fromDTO(dto: TrainingPhaseDTO): TrainingPhase {
        const result = new TrainingPhase();
        result.type = VisualizationPhaseTypeEnum.Training;
        result.allowedCommands = dto.allowed_commands;
        result.allowedWrongAnswers = dto.allowed_wrong_answers;
        result.estimatedDuration = dto.estimated_duration;
        result.tasks = TrainingPhaseTaskMapper.fromDTOs(dto.tasks);
        return result;
    }
}
