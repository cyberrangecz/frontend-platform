import { MapperBuilder } from '@crczp/api-common';
import { SandboxVpnCommand } from '@crczp/sandbox-model';
import { SandboxVpnCommandDTO } from '../../dto/sandbox-instance/sandbox-vpn-command-dto';

export const sandboxVpnCommandMapper = MapperBuilder.createDTOtoModelMapper<
    SandboxVpnCommandDTO,
    SandboxVpnCommand
>({
    mappedProperties: ['managementUrl', 'setupKey', 'routes', 'command'],
    mappers: {},
    constructor: (data) => SandboxVpnCommand.schema().parse(data),
});
