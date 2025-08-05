import { BasicLevelInfo } from './timeline-level';

export class TimelineEvent {
    text: string;
    time: number;
    score: number;
    levelType?: BasicLevelInfo.TimelineLevelTypeEnum;
    scoreChange?: number;
    levelOrder?: number;
    type?: BasicEventInfo.TimelineEventTypeEnum;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BasicEventInfo {
    export type TimelineEventTypeEnum =
        | 'CORRECT_ANSWER_EVENT'
        | 'ASSESSMENT_EVENTS'
        | 'HINT_TAKEN_EVENT'
        | 'WRONG_ANSWER_EVENT'
        | 'NON_TRAINING_EVENTS'
        | 'BASE_EVENTS';
    export const TimelineEventTypeEnum = {
        CORRECT_ANSWER: 'CORRECT_ANSWER_EVENT' as TimelineEventTypeEnum,
        ASSESSMENT_EVENTS: 'ASSESSMENT_EVENTS' as TimelineEventTypeEnum,
        HINT_TAKEN: 'HINT_TAKEN_EVENT' as TimelineEventTypeEnum,
        WRONG_ANSWER: 'WRONG_ANSWER_EVENT' as TimelineEventTypeEnum,
        NON_TRAINING: 'NON_TRAINING_EVENTS' as TimelineEventTypeEnum,
        BASE_EVENTS: 'BASE_EVENTS' as TimelineEventTypeEnum,
    };
}
