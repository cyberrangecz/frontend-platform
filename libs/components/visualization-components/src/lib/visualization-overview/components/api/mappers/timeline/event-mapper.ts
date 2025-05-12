import { TimelineEventDTO } from '../../dto/timeline/timeline-event-dto';
import { BasicEventInfo, TimelineEvent } from '../../../model/timeline/timeline-event';
import { BasicLevelInfoDTO } from '../../dto/timeline/timeline-level-data-dto';
import TimelineEventTypeEnum = BasicEventInfo.TimelineEventTypeEnum;

/**
 * @dynamic
 */
export class EventMapper {
    static fromDTOs(
        dtos: TimelineEventDTO[],
        levelOrder: number,
        levelType: BasicLevelInfoDTO.TimelineLevelTypeEnum,
    ): TimelineEvent[] {
        dtos = dtos.filter((event) => !event.text.includes('Correct answer'));
        return EventMapper.scoreChange(dtos.map((dto) => EventMapper.fromDTO(dto, levelOrder, levelType)));
    }

    static fromDTO(
        dto: TimelineEventDTO,
        levelOrder: number,
        levelType: BasicLevelInfoDTO.TimelineLevelTypeEnum,
    ): TimelineEvent {
        const event = new TimelineEvent();
        event.score = dto.score;
        event.text = dto.text;
        event.time = dto.time / 1000;
        event.levelOrder = levelOrder;
        event.levelType = levelType;
        event.type = EventMapper.eventType(event.text, event.levelType);

        return event;
    }

    static scoreChange(event: TimelineEvent[]): TimelineEvent[] {
        event.forEach((playerEvent, index) => {
            playerEvent.scoreChange = index ? event[index].score - event[index - 1].score : event[index].score;
            // for nice visualization score change is visualized when new level is started not when points are gained
            if (playerEvent.type == TimelineEventTypeEnum.CORRECT_ANSWER) {
                playerEvent.score = index ? event[index - 1].score : event[index].score;
            }
        });
        return event;
    }

    private static eventType(text: string, levelType: BasicLevelInfoDTO.TimelineLevelTypeEnum): TimelineEventTypeEnum {
        switch (text != '') {
            case text.includes('Correct answer') ||
                text.includes('Correct passkey') ||
                text.includes('answered') ||
                (text.includes('completed') && levelType !== BasicLevelInfoDTO.TimelineLevelTypeEnum.INFO): {
                return TimelineEventTypeEnum.CORRECT_ANSWER;
            }
            case text.includes('Wrong answer') || text.includes('Wrong passkey'): {
                return TimelineEventTypeEnum.WRONG_ANSWER;
            }
            case text.includes('Hint'): {
                return TimelineEventTypeEnum.HINT_TAKEN;
            }
            case text.includes('resumed') ||
                text.includes('ended') ||
                (text.includes('started') && text.includes('run')): {
                return TimelineEventTypeEnum.BASE_EVENTS;
            }
            default: {
                return TimelineEventTypeEnum.NON_TRAINING;
            }
        }
    }
}
