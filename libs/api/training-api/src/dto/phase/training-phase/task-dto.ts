import {AbstractPhaseDTO} from '../abstract-phase-dto';

export interface TaskDTO extends AbstractPhaseDTO {
    answer: string;
    content: string;
    solution: string;
    incorrect_answer_limit: number;
    modify_sandbox: boolean;
}
