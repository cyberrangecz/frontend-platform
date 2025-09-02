import { Topology } from '@crczp/sandbox-model';
import { TopologyGraphLink, TopologyGraphNode } from './topology-graph';
import { TOPOLOGY_CONFIG } from './topology-graph-config';

export function mapTopologyToTopologyVisualization(topology: Topology): {
    nodes: TopologyGraphNode[];
    links: TopologyGraphLink[];
} {
    const nodes: TopologyGraphNode[] = [];
    const links: TopologyGraphLink[] = [];

    let subnetOrd = 0;

    /* Internet node */
    nodes.push({ id: 'internet', name: 'Internet', nodeType: 'INTERNET' });

    topology.routers.forEach((router) => {
        nodes.push({
            id: router.name,
            name: router.name,
            nodeType: 'ROUTER',
            osType: mapOsType(router.osType),
            guiAccess: router.guiAccess,
        });

        links.push({
            id: `internet-${router.name}`,
            from: 'internet',
            to: router.name,
            length: 400,
        });

        router.subnets.forEach((subnet) => {
            const subnetId = `subnet-${router.name}-${subnet.name}`;
            nodes.push({
                id: subnetId,
                name: subnet.name,
                nodeType: 'SUBNET',
                ip: subnet.cidr,
                subnetColor:
                    TOPOLOGY_CONFIG.SVG.SUBNET.COLORS[
                        subnetOrd++ % TOPOLOGY_CONFIG.SVG.SUBNET.COLORS.length
                    ],
            });

            links.push({
                id: `${router.name}-${subnetId}`,
                from: router.name,
                to: subnetId,
                length: 500,
            });

            subnet.hosts.forEach((host) => {
                nodes.push({
                    id: host.name,
                    name: host.name,
                    nodeType: 'HOST',
                    ip: host.ip,
                    osType: mapOsType(host.osType),
                    guiAccess: host.guiAccess,
                });

                links.push({
                    id: `${host.name}-${subnetId}`,
                    from: host.name,
                    to: subnetId,
                    length: 400,
                });
            });
        });
    });

    return { nodes, links };
}

function mapOsType(osType: string) {
    return osType.toLowerCase() === 'linux' ? 'LINUX' : 'WINDOWS';
}
