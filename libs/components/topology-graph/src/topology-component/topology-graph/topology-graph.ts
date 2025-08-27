import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    inject,
    input,
    Output,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsoleTab } from '../../model/model';
import { Edge, Network, Node } from 'vis-network';
import { DataSet } from 'vis-data';
import { Minimap } from '../minimap/minimap';
import { ContextMenu } from '../context-menu/context-menu';
import { catchError, combineLatest, EMPTY, map, of } from 'rxjs';
import { TopologyNodeSvgService } from './services/topology-svg-generator.service';
import { ErrorHandlerService } from '@crczp/utils';
import { Topology } from '@crczp/sandbox-model';
import { mapTopologyToTopologyVisualization } from './topology-visualization-utils';
import { TOPOLOGY_CONFIG } from './topology-graph-config';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { TopologySplitViewSynchronizerService } from '../divider-position/topology-split-view-synchronizer.service';

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
    imports: [CommonModule, Minimap, ContextMenu, FormsModule],
    templateUrl: './topology-graph.html',
    styleUrl: './topology-graph.scss',
})
export class TopologyGraph implements AfterViewInit {
    @Output() openConsole = new EventEmitter<ConsoleTab>();

    topology = input.required<Topology>();
    height = input.required<number>();
    @ViewChild('networkContainer', { static: false })
    networkContainer: ElementRef<HTMLDivElement>;
    network: Network;

    private nodes: TopologyGraphNode[];
    private links: TopologyGraphLink[];

    private readonly svgService = inject(TopologyNodeSvgService);
    private readonly errorHandlerService = inject(ErrorHandlerService);
    private readonly topologySynchronizerService = inject(
        TopologySplitViewSynchronizerService
    );

    private nodeSubnetParentsDict: Record<string, string> = {};

    constructor() {
        toObservable(this.topology).subscribe((topology) =>
            this.handleTopologyChange(topology)
        );

        combineLatest([
            this.topologySynchronizerService.topologyWidth$,
            toObservable(this.height),
        ]).subscribe(([width, height]) =>
            this.handleDimensionsChange(width, height)
        );
    }

    ngAfterViewInit() {
        this.renderNetwork();
    }

    private handleDimensionsChange(width: number, height: number) {
        if (!this.networkContainer) return;
        this.networkContainer.nativeElement.style.width = `${width}px`;
        this.networkContainer.nativeElement.style.height = `${height}px`;
    }

    private handleTopologyChange(newTopology: Topology) {
        const visualizationData =
            mapTopologyToTopologyVisualization(newTopology);
        this.nodes = visualizationData.nodes;
        this.links = visualizationData.links;
        this.nodeSubnetParentsDict = {};
        newTopology.routers
            .flatMap((router) => router.subnets)
            .forEach((subnet) => {
                subnet.hosts.forEach((host) => {
                    this.nodeSubnetParentsDict[host.name] = subnet.name;
                });
            });
        this.renderNetwork();
    }

    private getNodeSize(nodeType: GraphNodeType): number {
        switch (nodeType) {
            case 'INTERNET':
                return 250;
            case 'ROUTER':
                return 110;
            case 'HOST':
                return 100;
            case 'SUBNET':
                return 175;
            default:
                return 100;
        }
    }

    private getNodeMass(nodeType: GraphNodeType): number {
        switch (nodeType) {
            case 'INTERNET':
                return 30;
            case 'ROUTER':
                return 5;
            case 'HOST':
                return 15;
            case 'SUBNET':
                return 5;
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
        let idx = 0;
        const svgObservables = this.nodes.map((node) => {
            if (node.nodeType === 'SUBNET') {
                return of({
                    id: node.id,
                    mass: this.getNodeMass('SUBNET'),
                    shape: 'image',
                    image: this.svgService.generateSubnetSvg(
                        node.name,
                        node.ip,
                        idx++
                    ),
                    size: this.getNodeSize('SUBNET'),
                });
            }
            if (node.nodeType === 'INTERNET') {
                return of({
                    id: node.id,
                    mass: this.getNodeMass('INTERNET'),
                    shape: 'image',
                    x: 0,
                    y: 0,
                    fixed: {
                        x: true,
                        y: true,
                    },

                    image: this.svgService.INTERNET_SVG,
                    size: this.getNodeSize('INTERNET'),
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
                catchError((err) => {
                    console.error('combineLatest error:', err);
                    return of([]);
                })
            )
            .subscribe((visNodes) => {
                this.instantiateNetwork(visNodes);
            });
    }

    private instantiateNetwork(mappedNodes: Node[]): void {
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

        const options = TOPOLOGY_CONFIG.GRAPH;
        options.physics.stabilization.iterations =
            1000 + this.nodes.length * 10;

        this.network = new Network(
            this.networkContainer.nativeElement,
            data,
            TOPOLOGY_CONFIG.GRAPH
        );

        // Event handlers
        this.network.on('dragEnd', () => {
            this.enforceViewportBounds();
        });

        // this.network.on('zoom', () => {
        //     this.enforceZoomLimits();
        //     this.enforceViewportBounds();
        // });

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
