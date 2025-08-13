import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsoleTab } from '../../model/model';
import { Edge, Network, Node, Options } from 'vis-network';
import { DataSet } from 'vis-data';
import { Minimap } from '../minimap/minimap';
import { ContextMenu } from '../context-menu/context-menu';
import { catchError, combineLatest, EMPTY, map, of, tap } from 'rxjs';
import { TopologyNodeSvgService } from '../services/topology-svg-generator.service';
import { ErrorHandlerService } from '@crczp/utils';
import { Topology } from '@crczp/sandbox-model';
import { mapTopologyToTopologyVisualization } from './topology-visualization-utils';

export type GraphNodeType = 'INTERNET' | 'ROUTER' | 'HOST' | 'SUBNET';

export type TopologyGraphNode = {
    id: string;
    name: string;
    nodeType: GraphNodeType;
    ip?: string;
    osType?: string;
    guiAccess?: boolean;
    subnets?: Array<{
        name: string;
        mask: string;
        hostCount: number;
    }>;
};

export type TopologyGraphLink = {
    id: string;
    from: string;
    to: string;
    length: number;
};

@Component({
    selector: 'crczp-topology-graph',
    standalone: true,
    imports: [CommonModule, Minimap, ContextMenu],
    templateUrl: './topology-graph.html',
    styleUrl: './topology-graph.scss',
})
export class TopologyGraph implements OnChanges, AfterViewInit {
    @Output() openConsole = new EventEmitter<ConsoleTab>();

    @Input({ required: true }) topology: Topology;
    @ViewChild('networkContainer', { static: false })
    networkContainer: ElementRef;
    network: Network;

    private nodes: TopologyGraphNode[];
    private links: TopologyGraphLink[];

    private readonly svgService = inject(TopologyNodeSvgService);
    private readonly errorHandlerService = inject(ErrorHandlerService);

    private nodeSubnetParentsDict: Record<string, string> = {};

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['topology']) {
            const visualizationData = mapTopologyToTopologyVisualization(
                this.topology
            );
            this.nodes = visualizationData.nodes;
            this.links = visualizationData.links;
            this.nodeSubnetParentsDict = {};
            this.topology.routers
                .flatMap((router) => router.subnets)
                .forEach((subnet) => {
                    subnet.hosts.forEach((host) => {
                        this.nodeSubnetParentsDict[host.name] = subnet.name;
                    });
                });
            this.renderNetwork();
        }
    }

    ngAfterViewInit() {
        this.renderNetwork();
    }

    private getNodeSize(nodeType: GraphNodeType): number {
        switch (nodeType) {
            case 'INTERNET':
                return 120;
            case 'ROUTER':
                return 110;
            case 'HOST':
                return 100;
            case 'SUBNET':
                return 200;
            default:
                return 100;
        }
    }

    private getNodeMass(nodeType: GraphNodeType): number {
        switch (nodeType) {
            case 'INTERNET':
                return 30;
            case 'ROUTER':
                return 1;
            case 'HOST':
                return 4;
            case 'SUBNET':
                return 6;
            default:
                return 1;
        }
    }

    private enforceViewportBounds(): void {
        if (!this.network || this.nodes.length === 0) return;

        const viewPosition = this.network.getViewPosition();
        const scale = this.network.getScale();

        const allNodePositions = this.nodes.map(
            (node) => this.network.getPositions([node.id])[node.id]
        );

        if (allNodePositions.some((pos) => !pos)) return;

        const xs = allNodePositions.map((pos) => pos.x);
        const ys = allNodePositions.map((pos) => pos.y);

        const minX = Math.min(...xs) - 200;
        const maxX = Math.max(...xs) + 200;
        const minY = Math.min(...ys) - 200;
        const maxY = Math.max(...ys) + 200;

        const boundedX = Math.max(minX, Math.min(viewPosition.x, maxX));
        const boundedY = Math.max(minY, Math.min(viewPosition.y, maxY));

        if (boundedX !== viewPosition.x || boundedY !== viewPosition.y) {
            this.network.moveTo({
                position: { x: boundedX, y: boundedY },
                scale,
                animation: {
                    duration: 400,
                    easingFunction: 'easeOutQuad',
                },
            });
        }
    }

    private enforceZoomLimits(): void {
        if (!this.network) return;

        const scale = this.network.getScale();

        if (scale < 0.1 || scale > 2) {
            const viewPosition = this.network.getViewPosition();
            this.network.moveTo({
                position: viewPosition,
                scale: Math.max(0.1, Math.min(scale, 2)),
                animation: false,
            });
        }
    }

    private renderNetwork(): void {
        const svgObservables = this.nodes.map((node) => {
            if (node.nodeType === 'SUBNET') {
                return of({
                    id: node.id,
                    mass: this.getNodeMass('SUBNET'),
                    shape: 'image',
                    image: this.svgService.generateSubnetSvg(
                        node.name,
                        node.ip
                    ),
                    size: this.getNodeSize('SUBNET'),
                });
            }
            return this.svgService
                .generateNodeSvg(
                    node.name,
                    node.nodeType,
                    node.osType === 'linux' ? 'LINUX' : 'WINDOWS',
                    node.ip,
                    node.guiAccess
                )
                .pipe(
                    map((svgDataUri) => ({
                        id: node.id,
                        shape: 'image',
                        image: svgDataUri,
                        size: this.getNodeSize(node.nodeType),
                        mass: this.getNodeMass(node.nodeType),
                    })),
                    catchError((err) => {
                        this.errorHandlerService.emitFrontendErrorNotification(
                            'Could not create node SVG',
                            'Topology graph'
                        );
                        console.error(err);
                        return EMPTY; // This will skip failed nodes entirely
                    })
                );
        });

        combineLatest(svgObservables)
            .pipe(
                tap(() => console.log('combineLatest completed')),
                catchError((err) => {
                    console.error('combineLatest error:', err);
                    return of([]);
                })
            )
            .subscribe((visNodes) => {
                console.log('svg created, nodes:', visNodes.length);
                this.instantiateNetwork(visNodes);
            });
    }

    private instantiateNetwork(mappedNodes: Node[]): void {
        console.log('instantiate network');
        if (!this.networkContainer) {
            return;
        }

        const visEdges = new DataSet<Edge>(
            this.links.map(
                (link) =>
                    ({
                        id: link.id,
                        from: link.from,
                        to: link.to,
                        color: {
                            color: '#002776',
                            highlight: '#0066cc',
                            hover: '#0066cc',
                        },
                        width: 2,
                        length: link.length,
                        smooth: {
                            type: 'continuous',
                            roundness: 0.2,
                        },
                    } as Edge)
            )
        );

        const data = {
            nodes: mappedNodes,
            edges: visEdges,
        };

        const options: Options = {
            edges: {
                color: '#002776',
                smooth: {
                    enabled: true,
                    type: 'continuous',
                    roundness: 0.2,
                },
                width: 2,
                selectionWidth: 4,
            },
            physics: {
                barnesHut: {
                    centralGravity: 0.3,
                    gravitationalConstant: -9000,
                    springConstant: 0.2,
                    springLength: 300,
                    theta: 0.4,
                    damping: 0.2,
                },
                stabilization: {
                    iterations: 500,
                },
                solver: 'barnesHut',
            },
            interaction: {
                hover: true,
                selectConnectedEdges: false,
                tooltipDelay: 200,
            },
            layout: {
                improvedLayout: true,
                clusterThreshold: 150,
            },
        };
        this.network = new Network(
            this.networkContainer.nativeElement,
            data,
            options
        );

        // Event handlers
        this.network.on('dragEnd', () => {
            this.enforceViewportBounds();
        });

        this.network.on('zoom', () => {
            this.enforceZoomLimits();
            this.enforceViewportBounds();
        });

        this.network.on('doubleClick', (event) => {
            if (event.nodes.length > 0) {
                const nodeId = event.nodes[0];
                const node = this.nodes.find((n) => n.id === nodeId);
                if (
                    node &&
                    (node.nodeType === 'HOST' || node.nodeType === 'ROUTER') &&
                    node.guiAccess &&
                    node.ip
                ) {
                    this.openConsole.emit({
                        ip: node.ip,
                        title: node.name,
                    });
                }
            }
        });
    }
}
