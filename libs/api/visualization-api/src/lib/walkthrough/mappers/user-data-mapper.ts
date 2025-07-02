import {UserDataDTO} from '../dto/user-data-dto';
import {UserEventMapper} from './user-event-mapper';
import {CommandEvent, CommandEventsModel, WalkthroughUserData} from '@crczp/visualization-model';
import {UserMapper} from '@crczp/training-api';

export class UserDataMapper {
    static fromDTO(dto: UserDataDTO, levelId: number): WalkthroughUserData {
        const userData = new WalkthroughUserData();
        userData.user = UserMapper.fromDTO(dto.user);
        userData.events =
            dto.events
                ?.map((eventDTO) => UserEventMapper.fromDTO(eventDTO, levelId))
                .filter((eventDTO) => eventDTO.type !== CommandEventsModel.OTHER) || [];
        userData.points = userData.events
            .map((eventDTO) => this.getEventHiddenPoints(eventDTO))
            .reduce((a, b) => a + b, 0);
        if (!userData.events.map((it) => it.type).includes(CommandEventsModel.CorrectAnswerSubmitted)) {
            userData.points += 130;
        }

        return userData;
    }

    static getEventHiddenPoints(event: CommandEvent): number {
        let points = 0;
        switch (event.type) {
            case CommandEventsModel.HintTaken:
                points += 8;
                break;
            case CommandEventsModel.WrongAnswerSubmitted:
                points += 20;
                break;
            case CommandEventsModel.SolutionDisplayed:
                points += 130;
                break;
            case CommandEventsModel.CorrectAnswerSubmitted:
                points += -40;
                break;
        }
        points += event.commands.length < 10 ? event.commands.length * 0.8 : 8;
        return points;
    }
}
