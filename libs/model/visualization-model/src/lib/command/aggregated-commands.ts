import { CommandPerOptions } from './command-per-options';

export class AggregatedCommands {
    cmd: string;
    commandType: string;
    frequency: number;
    commandPerOptions: CommandPerOptions[];
}
