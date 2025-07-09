import {VMConsole} from '@crczp/sandbox-model';
import {VMConsoleDTO} from '../../dto/sandbox-instance/vm-console-dto';

export class VMConsoleMapper {
    static fromDTO(dto: VMConsoleDTO): VMConsole {
        const result = new VMConsole();
        result.url = dto.url;
        return result;
    }
}
