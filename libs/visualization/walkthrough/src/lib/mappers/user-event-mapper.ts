import { UserEventDTO } from '../dto/user-event-dto';
import { Event } from '../model/event';
import { EventType } from '../model/enums/event-type';

export class UserEventMapper {
    static fromDTO(dto: UserEventDTO, levelId: number): Event {
        const userEvent = new Event();
        userEvent.time = dto.timestamp;
        userEvent.type = UserEventMapper.getType(dto.type);
        userEvent.level = levelId;
        userEvent.commands = dto.commands;
        userEvent.points = this.getEventShowPoints(userEvent.type);
        userEvent.points += dto.commands.length < 10 ? 0.8 * dto.commands.length : 8;
        return userEvent;
    }

    static getType(type: string): EventType {
        if (type === 'cz.cyberrange.platform.events.trainings.LevelStarted') {
            return EventType.LevelStarted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.TrainingRunStarted') {
            return EventType.TrainingRunStarted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.CorrectAnswerSubmitted') {
            return EventType.CorrectAnswerSubmitted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted') {
            return EventType.WrongAnswerSubmitted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.HintTaken') {
            return EventType.HintTaken;
        } else if (type === 'cz.cyberrange.platform.events.trainings.SolutionDisplayed') {
            return EventType.SolutionDisplayed;
        } else if (type === 'cz.cyberrange.platform.events.trainings.TrainingRunEnded') {
            return EventType.TrainingRunEnded;
        }
        return EventType.OTHER;
    }

    static getEventShowPoints(type: EventType): number {
        switch (type) {
            case EventType.HintTaken:
                return 8;
            case EventType.WrongAnswerSubmitted:
                return 20;
            case EventType.SolutionDisplayed:
                return 80;
            case EventType.CorrectAnswerSubmitted:
                return -40;
        }
        return 0;
    }
}
