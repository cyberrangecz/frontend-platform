import { Command } from '../../model/command';
import { CommandDTO } from '../dto/command-dto';

/**
 * @dynamic
 */
export class CommandMapper {
    static fromDTOs(dtos: CommandDTO[]): Command[] {
        return dtos.map((dto) => CommandMapper.fromDTO(dto));
    }

    static fromDTO(dto: CommandDTO): Command {
        const result = new Command();
        result.cmd = dto.cmd;
        result.options = dto.options;
        result.fromHostIp = dto.from_host_ip;
        result.commandType = dto.command_type;
        result.timestamp = dto.timestamp;
        result.trainingTime = dto.training_time;
        return result;
    }
}
