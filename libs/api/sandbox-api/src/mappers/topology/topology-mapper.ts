import { MapperBuilder } from '@crczp/api-common';
import {
    HostNodeDTO,
    RouterNodeDTO,
    SubnetDTO,
    TopologyDTO,
} from '../../dto/topology/topology-dto.model';
import {
    HostNode,
    OsType,
    RouterNode,
    Subnet,
    Topology,
} from '@crczp/sandbox-model';

export function parseOsType(input: string | undefined): OsType {
    switch (input) {
        case 'windows':
            return 'windows';
        case 'linux':
            return 'linux';
        default:
            return 'other';
    }
}

const hostMapper = MapperBuilder.createDTOtoModelMapper<HostNodeDTO, HostNode>({
    mappedProperties: ['name', 'ip', 'guiAccess', 'isAccessible'],
    mappers: {
        osType: (dto) => parseOsType(dto.os_type),
    },
    constructor: (data) => HostNode.schema().parse(data),
});

const subnetMapper = MapperBuilder.createDTOtoModelMapper<SubnetDTO, Subnet>({
    mappedProperties: ['name', 'cidr'],
    mappers: {
        hosts: (dto) => dto.hosts.map((host) => hostMapper(host)),
    },
    constructor: (data) => Subnet.schema().parse(data),
});

const routerMapper = MapperBuilder.createDTOtoModelMapper<
    RouterNodeDTO,
    RouterNode
>({
    mappedProperties: ['name', 'ip', 'guiAccess', 'isAccessible'],
    mappers: {
        subnets: (dto) => dto.subnets.map((subnet) => subnetMapper(subnet)),
        osType: (dto) => parseOsType(dto.os_type),
    },
    constructor: (data) => RouterNode.schema().parse(data),
});

export const topologyMapper = MapperBuilder.createDTOtoModelMapper<
    TopologyDTO,
    Topology
>({
    mappedProperties: [],
    mappers: {
        routers: (dto) => dto.routers.map((router) => routerMapper(router)),
    },
    constructor: (data) => Topology.schema().parse(data),
});
