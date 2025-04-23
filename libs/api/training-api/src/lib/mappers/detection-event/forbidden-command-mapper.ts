import { ForbiddenCommandDTO } from '../../dto/detection-event/forbidden-command-dto';
import { ForbiddenCommand } from '@crczp/training-model';

export class ForbiddenCommandMapper {
    static fromDTO(dto: ForbiddenCommandDTO): ForbiddenCommand {
        return {
            command: dto.command,
            type: dto.type,
            cheatingDetectionId: dto.cheating_detection_id,
        };
    }

    static fromDTOs(dtos: ForbiddenCommandDTO[]): ForbiddenCommand[] {
        return dtos.map((dto) => ForbiddenCommandMapper.fromDTO(dto));
    }

    static toDTO(forbiddenCommand: ForbiddenCommand): ForbiddenCommandDTO {
        return {
            command: forbiddenCommand.command,
            type: forbiddenCommand.type,
            cheating_detection_id: forbiddenCommand.cheatingDetectionId,
        };
    }

    static toDTOs(forbiddenCommands: ForbiddenCommand[]): ForbiddenCommandDTO[] {
        return forbiddenCommands.map((forbiddenCommand) => ForbiddenCommandMapper.toDTO(forbiddenCommand));
    }
}
