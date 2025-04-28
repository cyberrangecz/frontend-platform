import { DetectedForbiddenCommandDTO } from '../dto/detected-forbidden-command-dto';
import { DetectedForbiddenCommand, DetectedForbiddenCommandTypeEnum } from '@crczp/training-model';

/**
 * @dynamic
 */
export class DetectedForbiddenCommandMapper {
    static fromDTO(dto: DetectedForbiddenCommandDTO): DetectedForbiddenCommand {
        const result = new DetectedForbiddenCommand();
        result.command = dto.command;
        result.type = this.typeFromDTO(dto.type);
        result.hostname = dto.hostname;
        result.occurredAt = dto.occurred_at;
        return result;
    }

    static fromDTOs(dtos: DetectedForbiddenCommandDTO[]): DetectedForbiddenCommand[] {
        return dtos.map((dto) => DetectedForbiddenCommandMapper.fromDTO(dto));
    }

    private static typeFromDTO(
        type: DetectedForbiddenCommandDTO.DetectedForbiddenCommandTypeEnum,
    ): DetectedForbiddenCommandTypeEnum {
        switch (type) {
            case DetectedForbiddenCommandDTO.DetectedForbiddenCommandTypeEnum.BASH:
                return DetectedForbiddenCommandTypeEnum.Bash;
            case DetectedForbiddenCommandDTO.DetectedForbiddenCommandTypeEnum.MSF:
                return DetectedForbiddenCommandTypeEnum.Msf;
            default:
                console.error('Could not map DetectedForbiddenCommandTypeEnum to any known DTO');
        }
    }
}
