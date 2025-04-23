import { CommandPerOptionsDTO } from './command-per-options-dto';

export class AggregatedCommandsDTO {
    cmd: string;
    command_type: string;
    frequency: number;
    aggregated_commands_per_options: CommandPerOptionsDTO[];
}
