import { CommandLineEntryDTO } from '../dtos';
import { CommandLineEntry } from '@crczp/visualization-model';

export class ProgressCommandLineMapper {
    static fromDTOs(dtos: CommandLineEntryDTO[]): CommandLineEntry[] {
        return dtos ? dtos.map((dto) => ProgressCommandLineMapper.fromDTO(dto)) : [];
    }

    static fromDTO(dto: CommandLineEntryDTO): CommandLineEntry {
        const result = new CommandLineEntry();
        result.timestamp = new Date(dto.timestamp_str).getTime() / 1000;
        result.command = dto.cmd;
        return result;
    }
}
