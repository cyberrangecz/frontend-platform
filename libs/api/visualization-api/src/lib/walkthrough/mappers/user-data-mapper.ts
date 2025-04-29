import { UserDataDTO } from '../dto/user-data-dto';
import { UserEventMapper } from './user-event-mapper';
import { TrainingEvent, TrainingEventType, WalkthroughUserData } from '@crczp/visualization-model';
import { UserMapper } from '@crczp/training-api';

export class UserDataMapper {
    static fromDTO(dto: UserDataDTO, levelId: number): WalkthroughUserData {
        const userData = new WalkthroughUserData();
        userData.user = UserMapper.fromDTO(dto.user);
        userData.events =
            dto.events
                ?.map((eventDTO) => UserEventMapper.fromDTO(eventDTO, levelId))
                .filter((eventDTO) => eventDTO.type !== TrainingEventType.OTHER) || [];
        userData.points = userData.events
            .map((eventDTO) => this.getEventHiddenPoints(eventDTO))
            .reduce((a, b) => a + b, 0);
        if (!userData.events.map((it) => it.type).includes(TrainingEventType.CorrectAnswerSubmitted)) {
            userData.points += 130;
        }

        return userData;
    }

    static getEventHiddenPoints(event: TrainingEvent): number {
        let points = 0;
        switch (event.type) {
            case TrainingEventType.HintTaken:
                points += 8;
                break;
            case TrainingEventType.WrongAnswerSubmitted:
                points += 20;
                break;
            case TrainingEventType.SolutionDisplayed:
                points += 130;
                break;
            case TrainingEventType.CorrectAnswerSubmitted:
                points += -40;
                break;
        }
        points += event.commands.length < 10 ? event.commands.length * 0.8 : 8;
        return points;
    }
}
