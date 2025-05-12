import {
    TimelineEvent
} from '../../components/model/timeline/timeline-event';
import {
    BasicLevelInfo
} from '../../components/model/timeline/timeline-level';

const filterFunction = function(event: TimelineEvent) {
    return event.levelType === BasicLevelInfo.TimelineLevelTypeEnum.INFO;
};

export const infoLevelFilter = {
    name: 'infoLevelFilter',
    labelName: 'Info level',
    checked: false,
    filterFunction: filterFunction
};
