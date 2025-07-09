import {TaskDTO} from '../../dto/phase/training-phase/task-dto';
import {AbstractPhaseTypeEnum, AdaptiveTask} from '@crczp/training-model';
import {TaskUpdateDTO} from '../../dto/phase/training-phase/task-update-dto';
import {TaskCopyDTO} from '../../dto/phase/training-phase/task-copy-dto';

export class TaskMapper {
    static fromDTO(dto: TaskDTO): AdaptiveTask {
        const result = new AdaptiveTask();
        result.id = dto.id;
        result.title = dto.title;
        result.order = dto.order;
        result.type = AbstractPhaseTypeEnum.Task;
        result.answer = dto.answer;
        result.content = dto.content;
        result.incorrectAnswerLimit = dto.incorrect_answer_limit;
        result.solution = dto.solution;
        result.modifySandbox = dto.modify_sandbox;
        return result;
    }

    static toUpdateDTOs(tasks: AdaptiveTask[]): TaskUpdateDTO[] {
        return tasks.map(TaskMapper.toUpdateDTO);
    }

    static toUpdateDTO(task: AdaptiveTask): TaskUpdateDTO {
        const result = new TaskUpdateDTO();
        result.id = task.id;
        result.content = task.content;
        result.solution = task.solution;
        result.title = task.title;
        result.incorrect_answer_limit = task.incorrectAnswerLimit;
        result.answer = task.answer;
        result.modify_sandbox = task.modifySandbox;
        return result;
    }

    static toCopyDTO(task: AdaptiveTask): TaskCopyDTO {
        const result = new TaskCopyDTO();
        result.content = task.content;
        result.solution = task.solution;
        result.title = task.title;
        result.incorrect_answer_limit = task.incorrectAnswerLimit;
        result.answer = task.answer;
        result.modify_sandbox = task.modifySandbox;
        return result;
    }
}
