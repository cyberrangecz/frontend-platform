import {BasicEventInfo, TimelineEvent} from '../../components/model/timeline/timeline-event';

const filterFunction = function(event: TimelineEvent) {
    return event.type === BasicEventInfo.TimelineEventTypeEnum.HINT_TAKEN;
};

export const hintFilter = {
    name: 'hintFilter',
    labelName: 'Hints taken',
    checked: false,
    filterFunction: filterFunction
};
