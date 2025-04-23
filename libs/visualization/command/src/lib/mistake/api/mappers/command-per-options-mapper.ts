import { CommandPerOptions } from '../../model/command-per-options';
import { CommandPerOptionsDTO } from '../dto/command-per-options-dto';

/**
 * @dynamic
 */
export class CommandPerOptionsMapper {
    static fromDTOs(dtos: CommandPerOptionsDTO[]): CommandPerOptions[] {
        return dtos.map((dto) => CommandPerOptionsMapper.fromDTO(dto));
    }

    static fromDTO(dto: CommandPerOptionsDTO): CommandPerOptions {
        const result = new CommandPerOptions();
        result.cmd = dto.cmd;
        result.commandType = dto.cmd_type;
        result.fromHostIp = dto.from_host_ip;
        result.options = dto.options;
        result.mistake = dto.mistake;
        result.frequency = dto.frequency;
        return result;
    }
}
