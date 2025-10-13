import {AssessmentLevel} from '../../../model/timeline/assessment-level';
import {AssessmentLevelDTO} from '../../dto/timeline/assessment-level-dto';

export class AssessmentLevelMapper {
    static fromDTO(dto: AssessmentLevelDTO): AssessmentLevel {
        const level = new AssessmentLevel();
        level.assessmentType = dto.assessment_type;
        /* disabled -> current visualization do not use assessment levels
        level.questions = QuestionMapper.fromDTOs(dto.questions);
        level.score = dto.score // for future development -> does every assessment level have score?
        */
        return level;
    }
}
