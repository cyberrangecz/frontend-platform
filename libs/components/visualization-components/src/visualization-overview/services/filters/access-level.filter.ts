import {TimelineEvent} from '../../components/model/timeline/timeline-event';
import {BasicLevelInfo} from '../../components/model/timeline/timeline-level';

const filterFunction = function(event: TimelineEvent) {
    return event.levelType === BasicLevelInfo.TimelineLevelTypeEnum.ACCESS;
};

export const accessLevelFilter = {
    name: 'accessLevelFilter',
    labelName: 'Access level',
    checked: false,
    filterFunction: filterFunction
};
