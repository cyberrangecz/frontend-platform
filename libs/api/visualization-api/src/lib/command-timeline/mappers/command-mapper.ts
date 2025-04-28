import { CommandDTO } from '../dto/command-dto';
import { VisualizationCommand } from '@crczp/visualization-model';

/**
 * @dynamic
 */
export class CommandMapper {
    static fromDTOs(dtos: CommandDTO[]): VisualizationCommand[] {
        return dtos.map((dto) => CommandMapper.fromDTO(dto));
    }

    static fromDTO(dto: CommandDTO): VisualizationCommand {
        const result = new VisualizationCommand();
        result.cmd = dto.cmd;
        result.options = dto.options;
        result.fromHostIp = dto.from_host_ip;
        result.commandType = dto.command_type;
        result.timestamp = dto.timestamp;
        result.trainingTime = dto.training_time;
        return result;
    }
}
