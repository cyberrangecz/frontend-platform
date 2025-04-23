import { AbstractLevelDTO } from '../abstract-level-dto';
import { HintDTO } from './hint-dto';
import { MitreTechniqueDTO } from '../../mitre-techniques/mitre-technique-dto';
import { ReferenceSolutionNodeDTO } from './reference-solution-node-dto';

export interface TrainingLevelDto extends AbstractLevelDTO {
    content: string;
    answer: string;
    answer_variable_name: string;
    hints: HintDTO[];
    incorrect_answer_limit: number;
    level_type: AbstractLevelDTO.LevelTypeEnum;
    solution: string;
    solution_penalized: boolean;
    reference_solution: ReferenceSolutionNodeDTO[];
    variant_answers: boolean;
    mitre_techniques: MitreTechniqueDTO[];
    expected_commands: string[];
    commands_required: boolean;
}
