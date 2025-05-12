import {
    BasicEventInfo,
    TimelineEvent
} from '../../components/model/timeline/timeline-event';
import {
    BasicLevelInfo
} from '../../components/model/timeline/timeline-level';

const filterFunction = function(event: TimelineEvent) {
    return (
        event.levelType === BasicLevelInfo.TimelineLevelTypeEnum.TRAINING &&
        event.type !== BasicEventInfo.TimelineEventTypeEnum.HINT_TAKEN &&
        event.type !== BasicEventInfo.TimelineEventTypeEnum.WRONG_ANSWER
    );
};

export const trainingLevelFilter = {
    name: 'trainingLevelFilter',
    labelName: 'Training level',
    checked: true,
    filterFunction: filterFunction
};
