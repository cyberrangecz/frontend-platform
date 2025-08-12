import { HostNode, RouterNode, Subnet, Topology } from '@crczp/sandbox-model';
import { Edge } from 'vis-network';
import { catchError, EMPTY, forkJoin, map, Observable, take } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { TopologyNodeSvgService } from './topology-svg-generator.service';
import { ErrorHandlerService } from '@crczp/utils';
import { OsType, TopologyGraphNode } from '../topology-vis-types';
import { TOPOLOGY_CONFIG } from '../topology-config';

type ProcessedNode = {
    node: TopologyGraphNode;
    edge: Edge;
};

@Injectable()
export class TopologyVisualizationMapperService {
    private readonly svgService = inject(TopologyNodeSvgService);
    private readonly errorHandlerService = inject(ErrorHandlerService);

    public mapTopologyToTopologyVisualization(topology: Topology): Observable<{
        nodes: TopologyGraphNode[];
        links: Edge[];
    }> {
        const routerObservables = topology.routers.map((router) =>
            this.processRouter(router)
        );
        const subnetObservables = topology.routers.flatMap((router) =>
            router.subnets.map((subnet) => this.processSubnet(subnet, router))
        );

        const hostObservables = topology.routers.flatMap((router) =>
            router.subnets.flatMap((subnet) =>
                subnet.hosts.map((host) => this.processHost(host, subnet))
            )
        );

        return forkJoin([
            this.getInternetNode(),
            forkJoin(routerObservables),
            forkJoin(subnetObservables),
            forkJoin(hostObservables),
        ]).pipe(
            take(1),
            map(([internet, routers, subnets, hosts]) => {
                const nodes = [internet].concat(
                    routers
                        .concat(subnets)
                        .concat(hosts)
                        .map((data) => data.node)
                );
                const edges = routers
                    .concat(subnets)
                    .concat(hosts)
                    .map((data) => data.edge);
                return { nodes, links: edges };
            }),
            catchError((_err: Error) => {
                this.errorHandlerService.emitFrontendErrorNotification(
                    'could not render topology',
                    'Rendering topology'
                );
                return EMPTY;
            })
        );
    }

    private processSubnet(
        subnet: Subnet,
        parentRouter: RouterNode
    ): Observable<ProcessedNode> {
        return this.svgService
            .generateSubnetSvg(
                subnet.name,
                subnet.cidr,
                'rgba(255,255,255,1)',
                subnet.hosts.length
            )
            .pipe(
                map(({ collapsed, expanded }) => ({
                    node: {
                        name: subnet.name,
                        nodeType: 'SUBNET',
                        cidr: subnet.cidr,
                        router: parentRouter,
                        hosts: subnet.hosts,
                        collapsedUri: collapsed,
                        expandedUri: expanded,

                        id: subnet.name,
                        shape: 'image',
                        image: expanded,
                        size: TOPOLOGY_CONFIG.PHYSICS.SIZE.SUBNET,
                        mass: TOPOLOGY_CONFIG.PHYSICS.MASS.SUBNET,
                    },
                    edge: {
                        id: parentRouter.name + '-' + subnet.name,
                        from: parentRouter.name,
                        to: subnet.name,
                    },
                }))
            );
    }

    private processRouter(router: RouterNode): Observable<ProcessedNode> {
        return this.svgService
            .generateRouterSvg(
                router.name,
                this.translateOsType(router.osType),
                router.guiAccess
            )
            .pipe(
                map((svgDataUri) => ({
                    node: {
                        name: router.name,
                        nodeType: 'ROUTER',
                        subnets: router.subnets,
                        osType: this.translateOsType(router.osType),
                        guiAccess: router.guiAccess,

                        id: router.name,
                        shape: 'image',
                        image: svgDataUri,
                        size: TOPOLOGY_CONFIG.PHYSICS.SIZE.ROUTER,
                        mass: TOPOLOGY_CONFIG.PHYSICS.MASS.ROUTER,
                    },
                    edge: {
                        id: 'internet-' + router.name,
                        from: 'internet',
                        to: router.name,
                    },
                }))
            );
    }

    private processHost(
        host: HostNode,
        parentSubnet: Subnet
    ): Observable<ProcessedNode> {
        return this.svgService
            .generateHostSvg(
                host.name,
                this.translateOsType(host.osType),
                host.ip,
                host.guiAccess
            )
            .pipe(
                map((svgDataUri) => ({
                    node: {
                        name: host.name,
                        nodeType: 'HOST',
                        subnet: parentSubnet,
                        ip: host.ip,
                        osType: this.translateOsType(host.osType),
                        guiAccess: host.guiAccess,

                        id: host.name,
                        shape: 'image',
                        image: svgDataUri,
                        size: TOPOLOGY_CONFIG.PHYSICS.SIZE.HOST,
                        mass: TOPOLOGY_CONFIG.PHYSICS.MASS.HOST,
                    },
                    edge: {
                        id: parentSubnet.name + '-' + host.name,
                        from: parentSubnet.name,
                        to: host.name,
                    },
                }))
            );
    }

    private getInternetNode(): Observable<TopologyGraphNode> {
        return this.svgService.internetUri$.pipe(
            map((uri) => ({
                name: 'Internet',
                nodeType: 'INTERNET',

                id: 'internet',
                shape: 'image',
                image: uri,
                size: TOPOLOGY_CONFIG.PHYSICS.SIZE.INTERNET,
                mass: TOPOLOGY_CONFIG.PHYSICS.MASS.INTERNET,
            }))
        );
    }

    private translateOsType(osType: string): OsType {
        return osType.toLowerCase().includes('linux') ? 'LINUX' : 'WINDOWS';
    }
}
