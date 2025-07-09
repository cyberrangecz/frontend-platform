import {AbstractDetectionEventTypeEnum, ForbiddenCommandsDetectionEvent} from '@crczp/training-model';
import {
    ForbiddenCommandsDetectionEventDTO
} from '../../dto/detection-event/forbidden-commands/forbidden-commands-detection-event-dto';

export class ForbiddenCommandsDetectionEventMapper {
    static fromDTO(dto: ForbiddenCommandsDetectionEventDTO): ForbiddenCommandsDetectionEvent {
        const result = new ForbiddenCommandsDetectionEvent();
        result.commandCount = dto.command_count;
        result.detectionEventType = AbstractDetectionEventTypeEnum.Forbidden_commands;
        return result;
    }
}
