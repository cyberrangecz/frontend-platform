import { AggregatedCommands } from '../../model/aggregated-commands';
import { AggregatedCommandsDTO } from '../dto/aggregated-commands-dto';
import { CommandPerOptionsMapper } from './command-per-options-mapper';

/**
 * @dynamic
 */
export class AggregatedCommandMapper {
    static fromDTOs(dtos: AggregatedCommandsDTO[]): AggregatedCommands[] {
        return dtos.map((dto) => AggregatedCommandMapper.fromDTO(dto));
    }

    static fromDTO(dto: AggregatedCommandsDTO): AggregatedCommands {
        const result = new AggregatedCommands();
        result.cmd = dto.cmd;
        result.commandType = dto.command_type;
        result.frequency = dto.frequency;
        result.commandPerOptions = CommandPerOptionsMapper.fromDTOs(dto.aggregated_commands_per_options);
        return result;
    }
}
