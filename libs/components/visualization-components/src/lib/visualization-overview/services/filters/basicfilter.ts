import {BasicEventInfo, TimelineEvent} from '../../components/model/timeline/timeline-event';

/**
 * Are skips obsolete? Used for filtering of non-training levels instead
 * @param event
 */
const filterFunction = function(event: TimelineEvent) {
    return event.type === BasicEventInfo.TimelineEventTypeEnum.BASE_EVENTS;
};

export const basicfilter = {
    name: 'basicFilter',
    labelName: 'Run events',
    checked: false,
    filterFunction: filterFunction
};
