import {AbstractLevelTypeEnum, AssessmentLevel, AssessmentTypeEnum} from '@crczp/training-model';
import {AssessmentLevelDTO} from './../../../../dto/level/assessment/assessment-level-dto';
import {AnsweredAssessmentQuestionMapper} from './answered-assessment-question-mapper';

export class AnsweredAssessmentLevelMapper {
    static fromDTO(dto: AssessmentLevelDTO): AssessmentLevel {
        const result = new AssessmentLevel();
        result.type = AbstractLevelTypeEnum.Assessment;
        result.instructions = dto.instructions;
        result.assessmentType = this.typeFromDTO(dto.assessment_type);
        if (dto.questions && dto.questions.length !== 0) {
            result.questions = AnsweredAssessmentQuestionMapper.fromDTOs(dto.questions);
            result.questions = result.questions ? result.questions : [];
        }
        return result;
    }

    private static typeFromDTO(type: AssessmentLevelDTO.AssessmentTypeEnum): AssessmentTypeEnum {
        switch (type) {
            case AssessmentLevelDTO.AssessmentTypeEnum.TEST:
                return AssessmentTypeEnum.Test;
            case AssessmentLevelDTO.AssessmentTypeEnum.QUESTIONNAIRE:
                return AssessmentTypeEnum.Questionnaire;
            default:
                console.error('Could not map AssessmentType to any known type');
        }
    }
}
