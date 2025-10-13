import { TimelineEvent } from './timeline-event';

export abstract class TimelineLevel {
    id: number;
    order: number;
    levelType: BasicLevelInfo.TimelineLevelTypeEnum;
    events: TimelineEvent[];
    startTime: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BasicLevelInfo {
    export type TimelineLevelTypeEnum =
        | 'ASSESSMENT_LEVEL'
        | 'INFO_LEVEL'
        | 'TRAINING_LEVEL'
        | 'ACCESS_LEVEL';
    export const TimelineLevelTypeEnum = {
        ASSESSMENT: 'ASSESSMENT_LEVEL' as TimelineLevelTypeEnum,
        INFO: 'INFO_LEVEL' as TimelineLevelTypeEnum,
        TRAINING: 'TRAINING_LEVEL' as TimelineLevelTypeEnum,
        ACCESS: 'ACCESS_LEVEL' as TimelineLevelTypeEnum,
    };
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BasicAssessmentInfo {
    export type AssessmentTypeEnum = 'TEST_ASSESSMENT';
    export const AssessmentTypeEnum = {
        TEST: 'TEST_ASSESSMENT' as AssessmentTypeEnum,
    };
}
