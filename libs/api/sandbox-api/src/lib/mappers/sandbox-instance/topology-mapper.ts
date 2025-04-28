import {
    Topology,
    TopologyHost,
    TopologyLink,
    TopologyPort,
    TopologyRouter,
    TopologySwitch,
} from '@crczp/sandbox-model';
import { TopologyDTO } from '../../dto/sandbox-instance/topology-dto';
import { HostDTO } from '../../dto/sandbox-instance/topology-elements/host-dto';
import { LinkDTO } from '../../dto/sandbox-instance/topology-elements/link-dto';
import { PortDTO } from '../../dto/sandbox-instance/topology-elements/port-dto';
import { RouterDTO } from '../../dto/sandbox-instance/topology-elements/router-dto';
import { SwitchDTO } from '../../dto/sandbox-instance/topology-elements/switch-dto';

/**
 * @dynamic
 */
export class TopologyMapper {
    static fromDTO(dto: TopologyDTO): Topology {
        const topology = new Topology();
        topology.hosts = TopologyMapper.fromHostDTOs(dto.hosts);
        topology.routers = TopologyMapper.fromRouterDTOs(dto.routers);
        topology.switches = TopologyMapper.fromSwitchDTOs(dto.switches);
        topology.links = TopologyMapper.fromLinkDTOs(dto.links);
        topology.ports = TopologyMapper.fromPortDTOs(dto.ports);
        return topology;
    }

    static fromDTOs(dtos: TopologyDTO[]): Topology[] {
        return dtos.map((dto) => TopologyMapper.fromDTO(dto));
    }

    private static fromHostDTOs(dtos: HostDTO[]): TopologyHost[] {
        return dtos.map((dto) => TopologyMapper.fromHostDTO(dto));
    }

    private static fromRouterDTOs(dtos: RouterDTO[]): TopologyRouter[] {
        return dtos.map((dto) => TopologyMapper.fromRouterDTO(dto));
    }

    private static fromSwitchDTOs(dtos: SwitchDTO[]): TopologySwitch[] {
        return dtos.map((dto) => TopologyMapper.fromSwitchDTO(dto));
    }

    private static fromLinkDTOs(dtos: LinkDTO[]): TopologyLink[] {
        return dtos.map((dto) => TopologyMapper.fromLinkDTO(dto));
    }

    private static fromPortDTOs(dtos: PortDTO[]): TopologyPort[] {
        return dtos.map((dto) => TopologyMapper.fromPortDTO(dto));
    }

    private static fromHostDTO(dto: HostDTO): TopologyHost {
        const topologyHost = new TopologyHost();
        topologyHost.name = dto.name;
        return topologyHost;
    }

    private static fromRouterDTO(dto: RouterDTO): TopologyRouter {
        const topologyRouter = new TopologyRouter();
        topologyRouter.name = dto.name;
        topologyRouter.cidr = dto.cidr;
        return topologyRouter;
    }

    private static fromSwitchDTO(dto: SwitchDTO): TopologySwitch {
        const topologySwitch = new TopologySwitch();
        topologySwitch.name = dto.name;
        topologySwitch.cidr = dto.cidr;
        return topologySwitch;
    }

    private static fromLinkDTO(dto: LinkDTO): TopologyLink {
        const topologyLink = new TopologyLink();
        topologyLink.portA = dto.port_a;
        topologyLink.portB = dto.port_b;
        return topologyLink;
    }

    private static fromPortDTO(dto: PortDTO): TopologyPort {
        const topologyPort = new TopologyPort();
        topologyPort.ip = dto.mac;
        topologyPort.mac = dto.mac;
        topologyPort.parent = dto.parent;
        topologyPort.name = dto.name;
        return topologyPort;
    }
}
