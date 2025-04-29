import { UserEventDTO } from '../dto/user-event-dto';
import { TrainingEvent, TrainingEventType } from '@crczp/visualization-model';

export class UserEventMapper {
    static fromDTO(dto: UserEventDTO, levelId: number): TrainingEvent {
        const userEvent = new TrainingEvent();
        userEvent.time = dto.timestamp;
        userEvent.type = UserEventMapper.getType(dto.type);
        userEvent.level = levelId;
        userEvent.commands = dto.commands;
        userEvent.points = this.getEventShowPoints(userEvent.type);
        userEvent.points += dto.commands.length < 10 ? 0.8 * dto.commands.length : 8;
        return userEvent;
    }

    static getType(type: string): TrainingEventType {
        if (type === 'cz.cyberrange.platform.events.trainings.LevelStarted') {
            return TrainingEventType.LevelStarted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.TrainingRunStarted') {
            return TrainingEventType.TrainingRunStarted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.CorrectAnswerSubmitted') {
            return TrainingEventType.CorrectAnswerSubmitted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted') {
            return TrainingEventType.WrongAnswerSubmitted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.HintTaken') {
            return TrainingEventType.HintTaken;
        } else if (type === 'cz.cyberrange.platform.events.trainings.SolutionDisplayed') {
            return TrainingEventType.SolutionDisplayed;
        } else if (type === 'cz.cyberrange.platform.events.trainings.TrainingRunEnded') {
            return TrainingEventType.TrainingRunEnded;
        }
        return TrainingEventType.OTHER;
    }

    static getEventShowPoints(type: TrainingEventType): number {
        switch (type) {
            case TrainingEventType.HintTaken:
                return 8;
            case TrainingEventType.WrongAnswerSubmitted:
                return 20;
            case TrainingEventType.SolutionDisplayed:
                return 80;
            case TrainingEventType.CorrectAnswerSubmitted:
                return -40;
        }
        return 0;
    }
}
