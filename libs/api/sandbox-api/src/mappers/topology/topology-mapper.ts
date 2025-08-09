import { MapperBuilder } from '@crczp/api-common';
import {
    HostNodeDTO,
    RouterNodeDTO,
    SubnetDTO,
    TopologyDTO,
} from '../../dto/topology/topology-dto.model';
import { HostNode, RouterNode, Subnet, Topology } from '@crczp/sandbox-model';

const hostMapper = MapperBuilder.createDTOtoModelMapper<HostNodeDTO, HostNode>({
    mappedProperties: ['name', 'ip', 'osType', 'guiAccess'],
    mappers: {},
    constructor: HostNode.schema().parse,
});

const subnetMapper = MapperBuilder.createDTOtoModelMapper<SubnetDTO, Subnet>({
    mappedProperties: ['name', 'mask'],
    mappers: {
        hosts: (dto) => dto.hosts.map((host) => hostMapper(host)),
    },
    constructor: Subnet.schema().parse,
});

const routerMapper = MapperBuilder.createDTOtoModelMapper<
    RouterNodeDTO,
    RouterNode
>({
    mappedProperties: ['name', 'guiAccess', 'osType'],
    mappers: {
        subnets: (dto) => dto.subnets.map((subnet) => subnetMapper(subnet)),
    },
    constructor: RouterNode.schema().parse,
});

export const topologyMapper = MapperBuilder.createDTOtoModelMapper<
    TopologyDTO,
    Topology
>({
    mappedProperties: [],
    mappers: {
        routers: (dto) => dto.routers.map((router) => routerMapper(router)),
    },
    constructor: Topology.schema().parse,
});
