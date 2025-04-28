import { HostDTO } from './topology-elements/host-dto';
import { LinkDTO } from './topology-elements/link-dto';
import { PortDTO } from './topology-elements/port-dto';
import { RouterDTO } from './topology-elements/router-dto';
import { SwitchDTO } from './topology-elements/switch-dto';

export class TopologyDTO {
    hosts: HostDTO[];
    routers: RouterDTO[];
    switches: SwitchDTO[];
    links: LinkDTO[];
    ports: PortDTO[];
}
