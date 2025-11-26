import {BasicEventInfo, TimelineEvent} from '../../components/model/timeline/timeline-event';

const filterFunction = function(event: TimelineEvent) {
    return event.type === BasicEventInfo.TimelineEventTypeEnum.CORRECT_ANSWER;
};

export const correctAnswerFilter = {
    name: 'correctAnswerFilter',
    labelName: 'Correct answers/passkeys / finished levels',
    checked: true,
    filterFunction: filterFunction
};
