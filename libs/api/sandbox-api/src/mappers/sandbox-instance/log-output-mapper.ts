import { LogOutputDTO } from '../../dto/sandbox-instance/stages/log-output-dto';
import { LogOutput } from '@crczp/sandbox-model';

export const logOutputMapper = (dto: LogOutputDTO) =>
    LogOutput.schema().parse(dto);
