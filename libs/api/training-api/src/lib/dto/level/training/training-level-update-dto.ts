import { MitreTechniqueDTO } from '../../mitre-techniques/mitre-technique-dto';
import { AbstractLevelDTO } from '../abstract-level-dto';
import { HintDTO } from './hint-dto';
import { ReferenceSolutionNodeDTO } from './reference-solution-node-dto';

export interface TrainingLevelUpdateDto {
    id: number;
    max_score?: number;
    content?: string;
    estimated_duration?: number;
    minimal_possible_solve_time?: number;
    answer?: string;
    answer_variable_name?: string;
    hints?: HintDTO[];
    incorrect_answer_limit?: number;
    level_type: AbstractLevelDTO.LevelTypeEnum;
    solution?: string;
    solution_penalized?: boolean;
    reference_solution?: ReferenceSolutionNodeDTO[];
    variant_answers?: boolean;
    order: number;
    mitre_techniques: MitreTechniqueDTO[];
    expected_commands: string[];
}

export class TrainingLevelUpdateDTOClass implements TrainingLevelUpdateDto {
    content: string;
    estimated_duration: number;
    minimal_possible_solve_time: number;
    answer: string;
    answer_variable_name: string;
    hints: HintDTO[];
    id: number;
    incorrect_answer_limit: number;
    level_type: AbstractLevelDTO.LevelTypeEnum = 'TRAINING_LEVEL';
    max_score: number;
    solution: string;
    solution_penalized: boolean;
    reference_solution: ReferenceSolutionNodeDTO[];
    title: string;
    variant_answers: boolean;
    order: number;
    mitre_techniques: MitreTechniqueDTO[];
    expected_commands: string[];
    commands_required: boolean;
}
