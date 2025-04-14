import { TopologyHost } from './sandbox-topology-elements/topology-host';
import { TopologyLink } from './sandbox-topology-elements/topology-link';
import { TopologyPort } from './sandbox-topology-elements/topology-port';
import { TopologyRouter } from './sandbox-topology-elements/topology-router';
import { TopologySwitch } from './sandbox-topology-elements/topology-switch';

export class Topology {
    hosts: TopologyHost[] = [];
    routers: TopologyRouter[] = [];
    switches: TopologySwitch[] = [];
    links: TopologyLink[] = [];
    ports: TopologyPort[] = [];
}
