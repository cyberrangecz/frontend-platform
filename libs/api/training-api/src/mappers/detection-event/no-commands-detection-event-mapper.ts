import {AbstractDetectionEventTypeEnum, NoCommandsDetectionEvent} from '@crczp/training-model';
import {NoCommandsDetectionEventDTO} from '../../dto/detection-event/no-commands/no-commands-detection-event-dto';

export class NoCommandsDetectionEventMapper {
    static fromDTO(_dto: NoCommandsDetectionEventDTO): NoCommandsDetectionEvent {
        const result = new NoCommandsDetectionEvent();
        result.detectionEventType = AbstractDetectionEventTypeEnum.No_commands;
        return result;
    }
}
