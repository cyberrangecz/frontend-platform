import { TrainingPhaseDTO } from '../../dto/phase/training-phase/training-phase-dto';
import { AbstractPhaseTypeEnum, DecisionMatrixRow, Task, TrainingPhase } from '@crczp/training-model';
import { TrainingPhaseUpdateDTO } from '../../dto/phase/training-phase/training-phase-update-dto';
import { TaskDTO } from '../../dto/phase/training-phase/task-dto';
import { TaskMapper } from './task-mapper';
import { DecisionMatrixRowDTO } from '../../dto/phase/training-phase/decision-matrix-row-dto';
import { MitreTechniqueMapper } from '../mitre-techniques/mitre-technique-mapper';

export class TrainingPhaseMapper {
    static fromDTO(dto: TrainingPhaseDTO): TrainingPhase {
        const result = new TrainingPhase();
        result.type = AbstractPhaseTypeEnum.Training;
        result.allowedCommands = dto.allowed_commands;
        result.allowedWrongAnswers = dto.allowed_wrong_answers;
        result.estimatedDuration = dto.estimated_duration;
        if (dto.decision_matrix === undefined || dto.decision_matrix === null) {
            result.decisionMatrix = [];
        } else {
            result.decisionMatrix = this.mapDecisionMatrixFromDTO(
                dto.decision_matrix.sort((a, b) => a.order - b.order),
            );
        }
        if (dto.tasks === undefined || dto.tasks === null) {
            result.tasks = [];
        } else {
            result.tasks = this.mapTasks(dto.tasks.sort((a, b) => a.order - b.order));
        }
        if (dto.task) {
            result.currentTask = TaskMapper.fromDTO(dto.task);
        }
        if (dto.mitre_techniques) {
            result.mitreTechniques = MitreTechniqueMapper.fromDTOs(dto.mitre_techniques);
        }
        result.expectedCommands = dto.expected_commands ? dto.expected_commands : [];
        return result;
    }

    static toUpdateDTO(phase: TrainingPhase): TrainingPhaseUpdateDTO {
        const result = new TrainingPhaseUpdateDTO();
        result.id = phase.id;
        result.title = phase.title;
        result.order = phase.order;
        result.allowed_commands = phase.allowedCommands;
        result.allowed_wrong_answers = phase.allowedWrongAnswers;
        result.estimated_duration = phase.estimatedDuration;
        result.title = phase.title;
        result.decision_matrix = this.mapDecisionMatrixToDTO(phase.decisionMatrix);
        result.tasks = TaskMapper.toUpdateDTOs(phase.tasks);
        if (phase.mitreTechniques) {
            result.mitre_techniques = MitreTechniqueMapper.toDTOs(phase.mitreTechniques);
        }
        result.expected_commands = phase.expectedCommands;
        return result;
    }

    private static mapTasks(tasksDTO: TaskDTO[]): Task[] {
        return tasksDTO.map(TaskMapper.fromDTO);
    }

    private static mapDecisionMatrixFromDTO(rows: DecisionMatrixRowDTO[]): DecisionMatrixRow[] {
        return rows.map((rowDTO) => {
            const row = new DecisionMatrixRow();
            row.questionnaireAnswered = rowDTO.questionnaire_answered;
            row.wrongAnswers = rowDTO.wrong_answers;
            row.solutionDisplayed = rowDTO.solution_displayed;
            row.keywordUsed = rowDTO.keyword_used;
            row.completedInTime = rowDTO.completed_in_time;
            row.id = rowDTO.id;
            row.order = rowDTO.order;
            return row;
        });
    }

    private static mapDecisionMatrixToDTO(rows: DecisionMatrixRow[]): DecisionMatrixRowDTO[] {
        return rows.map((row) => {
            const rowDTO = new DecisionMatrixRowDTO();
            rowDTO.questionnaire_answered = row.questionnaireAnswered;
            rowDTO.wrong_answers = row.wrongAnswers;
            rowDTO.solution_displayed = row.solutionDisplayed;
            rowDTO.keyword_used = row.keywordUsed;
            rowDTO.completed_in_time = row.completedInTime;
            rowDTO.id = row.id;
            rowDTO.order = row.order;
            return rowDTO;
        });
    }
}
