import {TimelineQuestionDTO} from './timeline-question-dto';
import {BasicAssessmentInfoDTO, TimelineLevelDataDTO} from './timeline-level-data-dto';

export interface AssessmentLevelDTO extends TimelineLevelDataDTO {
    assessment_type: BasicAssessmentInfoDTO.AssessmentTypeEnum;
    questions: TimelineQuestionDTO[];
}
