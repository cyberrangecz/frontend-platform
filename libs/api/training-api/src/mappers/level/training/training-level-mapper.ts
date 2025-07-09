import {AbstractLevelTypeEnum, TrainingLevel} from '@crczp/training-model';
import {TrainingLevelDto} from '../../../dto/level/training/training-level-dto';
import {
    TrainingLevelUpdateDto,
    TrainingLevelUpdateDTOClass,
} from '../../../dto/level/training/training-level-update-dto';
import {MitreTechniqueMapper} from '../../mitre-techniques/mitre-technique-mapper';
import {HintMapper} from './hint-mapper';
import {ReferenceSolutionNodeMapper} from './reference-solution-node-mapper';

export class TrainingLevelMapper {
    static fromDTO(dto: TrainingLevelDto): TrainingLevel {
        const result = new TrainingLevel();
        result.hints = HintMapper.fromDTOs(dto.hints);
        result.type = AbstractLevelTypeEnum.Training;
        result.answer = dto.answer;
        result.answerVariableName = dto.answer_variable_name;
        result.content = dto.content;
        result.solution = dto.solution;
        result.incorrectAnswerLimit = dto.incorrect_answer_limit;
        result.solutionPenalized = dto.solution_penalized;
        if (dto.reference_solution) {
            result.referenceSolution = ReferenceSolutionNodeMapper.fromDTOs(dto.reference_solution);
        }
        result.variantAnswers = dto.variant_answers;
        if (dto.mitre_techniques) {
            result.mitreTechniques = MitreTechniqueMapper.fromDTOs(dto.mitre_techniques);
        }
        result.expectedCommands = dto.expected_commands;
        result.commandsRequired = dto.commands_required;
        return result;
    }

    static toUpdateDTO(trainingLevel: TrainingLevel): TrainingLevelUpdateDto {
        const result = new TrainingLevelUpdateDTOClass();
        result.id = trainingLevel.id;
        result.title = trainingLevel.title;
        result.max_score = trainingLevel.maxScore;
        result.content = trainingLevel.content;
        result.estimated_duration = trainingLevel.estimatedDuration;
        result.minimal_possible_solve_time = trainingLevel.minimalPossibleSolveTime;
        result.answer = trainingLevel.answer;
        result.answer_variable_name = trainingLevel.answerVariableName;
        result.incorrect_answer_limit = trainingLevel.incorrectAnswerLimit;
        result.solution = trainingLevel.solution;
        result.solution_penalized = trainingLevel.solutionPenalized;
        result.variant_answers = trainingLevel.variantAnswers;
        result.hints = HintMapper.toDTOs(trainingLevel.hints);
        result.reference_solution = ReferenceSolutionNodeMapper.toDTOs(trainingLevel.referenceSolution);
        if (trainingLevel.mitreTechniques) {
            result.mitre_techniques = MitreTechniqueMapper.toDTOs(trainingLevel.mitreTechniques);
        }
        result.expected_commands = trainingLevel.expectedCommands;
        result.commands_required = trainingLevel.commandsRequired;
        return result;
    }
}
