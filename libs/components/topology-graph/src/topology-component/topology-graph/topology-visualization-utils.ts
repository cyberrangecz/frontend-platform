import { Topology } from '@crczp/sandbox-model';
import { TopologyGraphLink, TopologyGraphNode } from './topology-graph';

export function mapTopologyToTopologyVisualization(topology: Topology): {
    nodes: TopologyGraphNode[];
    links: TopologyGraphLink[];
} {
    const nodes: TopologyGraphNode[] = [];
    const links: TopologyGraphLink[] = [];

    /* Internet node */
    nodes.push({ id: 'internet', name: 'Internet', nodeType: 'INTERNET' });

    /* Build topology upward: router → subnets → hosts */
    topology.routers.forEach((router) => {
        /* Router node */
        nodes.push({
            id: router.name,
            name: router.name,
            nodeType: 'ROUTER',
            osType: router.osType,
            guiAccess: router.guiAccess,
        });

        /* Router → Internet */
        links.push({
            id: `internet-${router.name}`,
            from: 'internet',
            to: router.name,
            length: 1000,
        });

        /* Subnets & hosts */
        router.subnets.forEach((subnet) => {
            const subnetId = `subnet-${router.name}-${subnet.name}`;
            /* Subnet node (leaf of router, root of hosts) */
            nodes.push({
                id: subnetId,
                name: subnet.name,
                nodeType: 'SUBNET',
                ip: subnet.mask, // hijack ip slot for mask
            });

            links.push({
                id: `${router.name}-${subnetId}`,
                from: router.name,
                to: subnetId,
                length: 900,
            });

            subnet.hosts.forEach((host) => {
                nodes.push({
                    id: host.name,
                    name: host.name,
                    nodeType: 'HOST',
                    ip: host.ip,
                    osType: host.osType,
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
