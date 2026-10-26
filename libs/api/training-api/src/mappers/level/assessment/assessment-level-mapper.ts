import {AbstractLevelTypeEnum, AssessmentLevel, AssessmentTypeEnum} from '@crczp/training-model';
import {AssessmentLevelDTO, AssessmentLevelDTOAssessmentTypeEnum} from '../../../dto/level/assessment/assessment-level-dto';
import {
    AssessmentLevelUpdateDTO,
    AssessmentLevelUpdateDTOClass,
} from '../../../dto/level/assessment/assessment-level-update-dto';
import {QuestionMapper} from './question-mapper';

export class AssessmentLevelMapper {
    static fromDTO(dto: AssessmentLevelDTO): AssessmentLevel {
        const result = new AssessmentLevel();
        result.type = AbstractLevelTypeEnum.Assessment;
        result.instructions = dto.instructions;
        result.assessmentType = this.typeFromDTO(dto.assessment_type);
        if (dto.questions && dto.questions.length !== 0) {
            result.questions = QuestionMapper.fromDTOs(dto.questions);
            result.questions = result.questions ? result.questions : [];
        }
        return result;
    }

    static toUpdateDTO(level: AssessmentLevel): AssessmentLevelUpdateDTO {
        const result = new AssessmentLevelUpdateDTOClass();
        result.id = level.id;
        result.title = level.title;
        result.max_score = level.maxScore;
        result.estimated_duration = level.estimatedDuration;
        result.minimal_possible_solve_time = level.minimalPossibleSolveTime;
        result.instructions = level.instructions;
        result.type = this.typeToDTO(level.assessmentType);
        result.questions = QuestionMapper.toCreateDTOs(level.questions);
        return result;
    }

    private static typeFromDTO(type: AssessmentLevelDTOAssessmentTypeEnum): AssessmentTypeEnum {
        switch (type) {
            case AssessmentLevelDTOAssessmentTypeEnum.TEST:
                return AssessmentTypeEnum.Test;
            case AssessmentLevelDTOAssessmentTypeEnum.QUESTIONNAIRE:
                return AssessmentTypeEnum.Questionnaire;
            default:
                console.error('Could not map AssessmentType to any known type');
        }
    }

    private static typeToDTO(type: AssessmentTypeEnum): AssessmentLevelDTOAssessmentTypeEnum {
        switch (type) {
            case AssessmentTypeEnum.Test:
                return AssessmentLevelDTOAssessmentTypeEnum.TEST;
            case AssessmentTypeEnum.Questionnaire:
                return AssessmentLevelDTOAssessmentTypeEnum.QUESTIONNAIRE;
            default:
                console.error('Could not map AssessmentType to any known DTO');
        }
    }
}
