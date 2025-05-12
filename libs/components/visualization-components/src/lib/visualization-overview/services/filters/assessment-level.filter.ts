import {
    BasicEventInfo,
    TimelineEvent
} from '../../components/model/timeline/timeline-event';
import {
    BasicLevelInfo
} from '../../components/model/timeline/timeline-level';

const filterFunction = function(event: TimelineEvent) {
    return (
        event.levelType === BasicLevelInfo.TimelineLevelTypeEnum.ASSESSMENT &&
        event.type !== BasicEventInfo.TimelineEventTypeEnum.BASE_EVENTS
    );
};

export const assessmentLevelFilter = {
    name: 'assessmentLevelFilter',
    labelName: 'Assessment level',
    checked: false,
    filterFunction: filterFunction
};
