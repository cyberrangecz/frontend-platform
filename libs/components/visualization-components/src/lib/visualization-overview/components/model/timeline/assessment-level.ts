import { TimelineQuestion } from './timeline-question';
import { BasicAssessmentInfo, TimelineLevel } from './timeline-level';

export class AssessmentLevel extends TimelineLevel {
    assessmentType: BasicAssessmentInfo.AssessmentTypeEnum;
    questions: TimelineQuestion[];

    constructor() {
        super();
    }
}
