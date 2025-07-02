import {HostDTO} from './host-dto.model';
import {LinkDTO} from './link-dto.model';
import {RouterDTO} from './router-dto.model';
import {SwitchDTO} from './switch-dto.model';
import {PortDTO} from './port-dto.model';
import {SpecialNodeDTO} from './special-node-dto.model';

export class TopologyDTO {
    hosts: HostDTO[];
    links: LinkDTO[];
    ports: PortDTO[];
    routers: RouterDTO[];
    switches: SwitchDTO[];
    special_nodes?: SpecialNodeDTO[];
}
