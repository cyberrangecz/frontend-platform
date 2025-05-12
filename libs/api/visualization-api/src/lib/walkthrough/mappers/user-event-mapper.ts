import { UserEventDTO } from '../dto/user-event-dto';
import { CommandEvent, CommandEventsModel } from '@crczp/visualization-model';

export class UserEventMapper {
    static fromDTO(dto: UserEventDTO, levelId: number): CommandEvent {
        const userEvent = new CommandEvent();
        userEvent.time = dto.timestamp;
        userEvent.type = UserEventMapper.getType(dto.type);
        userEvent.level = levelId;
        userEvent.commands = dto.commands;
        userEvent.points = this.getEventShowPoints(userEvent.type);
        userEvent.points += dto.commands.length < 10 ? 0.8 * dto.commands.length : 8;
        return userEvent;
    }

    static getType(type: string): CommandEventsModel {
        if (type === 'cz.cyberrange.platform.events.trainings.LevelStarted') {
            return CommandEventsModel.LevelStarted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.TrainingRunStarted') {
            return CommandEventsModel.TrainingRunStarted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.CorrectAnswerSubmitted') {
            return CommandEventsModel.CorrectAnswerSubmitted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted') {
            return CommandEventsModel.WrongAnswerSubmitted;
        } else if (type === 'cz.cyberrange.platform.events.trainings.HintTaken') {
            return CommandEventsModel.HintTaken;
        } else if (type === 'cz.cyberrange.platform.events.trainings.SolutionDisplayed') {
            return CommandEventsModel.SolutionDisplayed;
        } else if (type === 'cz.cyberrange.platform.events.trainings.TrainingRunEnded') {
            return CommandEventsModel.TrainingRunEnded;
        }
        return CommandEventsModel.OTHER;
    }

    static getEventShowPoints(type: CommandEventsModel): number {
        switch (type) {
            case CommandEventsModel.HintTaken:
                return 8;
            case CommandEventsModel.WrongAnswerSubmitted:
                return 20;
            case CommandEventsModel.SolutionDisplayed:
                return 80;
            case CommandEventsModel.CorrectAnswerSubmitted:
                return -40;
        }
        return 0;
    }
}
