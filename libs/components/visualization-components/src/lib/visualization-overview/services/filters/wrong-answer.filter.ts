import {
    BasicEventInfo,
    TimelineEvent
} from '../../components/model/timeline/timeline-event';

const filterFunction = function(event: TimelineEvent) {
    return event.type === BasicEventInfo.TimelineEventTypeEnum.WRONG_ANSWER;
};

export const wrongAnswerFilter = {
    name: 'wrongAnswerFilter',
    labelName: 'Wrong answers/passkeys',
    checked: false,
    filterFunction: filterFunction
};
