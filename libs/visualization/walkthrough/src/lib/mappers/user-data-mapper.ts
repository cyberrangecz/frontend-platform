import { UserDataDTO } from '../dto/user-data-dto';
import { UserData } from '../model/user-data';
import { UserEventMapper } from './user-event-mapper';
import { EventType } from '../model/enums/event-type';
import { Event } from '../model/event';
import { UserMapper } from './user-mapper';

export class UserDataMapper {
    static fromDTO(dto: UserDataDTO, levelId: number): UserData {
        const userData = new UserData();
        userData.user = UserMapper.fromDTO(dto.user);
        userData.events =
            dto.events
                ?.map((eventDTO) => UserEventMapper.fromDTO(eventDTO, levelId))
                .filter((eventDTO) => eventDTO.type !== EventType.OTHER) || [];
        userData.points = userData.events
            .map((eventDTO) => this.getEventHiddenPoints(eventDTO))
            .reduce((a, b) => a + b, 0);
        if (!userData.events.map((it) => it.type).includes(EventType.CorrectAnswerSubmitted)) {
            userData.points += 130;
        }

        return userData;
    }

    static getEventHiddenPoints(event: Event): number {
        let points = 0;
        switch (event.type) {
            case EventType.HintTaken:
                points += 8;
                break;
            case EventType.WrongAnswerSubmitted:
                points += 20;
                break;
            case EventType.SolutionDisplayed:
                points += 130;
                break;
            case EventType.CorrectAnswerSubmitted:
                points += -40;
                break;
        }
        points += event.commands.length < 10 ? event.commands.length * 0.8 : 8;
        return points;
    }
}
