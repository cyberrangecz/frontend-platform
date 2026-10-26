/** The parts of a topology response from the sandbox service that the graph draws. */
export interface TopologyPayload {
    routers: {
        name: string;
        subnets: { name: string; cidr: string; hosts: { name: string }[] }[];
    }[];
}

function counted(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Describes the graph a topology response is drawn as, for a visual check of the canvas. */
export function describeTopology(topology: TopologyPayload): string {
    const routers = topology.routers.map((router) => {
        const subnets = router.subnets.map(
            (subnet) =>
                `subnet ${subnet.name} (${subnet.cidr}) with ${counted(subnet.hosts.length, 'host')} ${
                    subnet.hosts.map((host) => host.name).join(', ') || '-'
                }`,
        );
        return `router ${router.name} linked to ${counted(router.subnets.length, 'subnet')}: ${subnets.join('; ')}`;
    });
    return `Topology graph with an Internet node linked to ${counted(topology.routers.length, 'router')}; ${routers.join('; ')}`;
}
