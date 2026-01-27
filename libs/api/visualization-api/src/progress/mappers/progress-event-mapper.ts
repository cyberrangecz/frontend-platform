import { ProgressEventDTO } from '../dtos';
import {
    HintTakenEvent,
    ProgressEvent,
    ProgressEventType,
    SolutionDisplayedEvent,
    TrainingRunEndedEvent,
    TrainingRunStartedEvent,
    WrongAnswerEvent,
} from '@crczp/visualization-model';

export class ProgressEventMapper {
    static fromDTOs(dtos: ProgressEventDTO[]): ProgressEvent[] {
        return dtos
            .map((dto) => ProgressEventMapper.fromDTO(dto))
            .filter((event) => event);
    }

    static fromDTO(dto: ProgressEventDTO): ProgressEvent {
        return ProgressEventMapper.eventResolver(dto);
    }

    private static eventResolver(dto: ProgressEventDTO): ProgressEvent {
        let event;
        switch (dto.type) {
            case ProgressEventType.HintTaken: {
                event = new HintTakenEvent(dto.hint_id, dto.hint_title);
                break;
            }
            case ProgressEventType.WrongAnswer: {
                event = new WrongAnswerEvent(dto.answer_content);
                break;
            }
            case ProgressEventType.SolutionDisplayed: {
                event = new SolutionDisplayedEvent();
                break;
            }
            case ProgressEventType.TrainingRunFinished: {
                event = new TrainingRunEndedEvent();
                break;
            }
            case ProgressEventType.TrainingRunStarted: {
                event = new TrainingRunStartedEvent();
                break;
            }
            default: {
                return;
            }
        }
        event.timestamp = dto.timestamp;
        event.trainingTime = dto.training_time;
        event.levelId = dto.level;
        return event;
    }
}
