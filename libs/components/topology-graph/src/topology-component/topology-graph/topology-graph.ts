import {
    AfterViewInit,
    Component,
    ElementRef,
    inject,
    input,
    output,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Edge, Network, Node } from 'vis-network';
import { DataSet } from 'vis-data';
import { Minimap } from '../minimap/minimap';
import { ContextMenu, ContextMenuItem } from '../context-menu/context-menu';
import { catchError, combineLatest, EMPTY, map, of } from 'rxjs';
import { TopologyNodeSvgService } from './services/topology-svg-generator.service';
import { ErrorHandlerService } from '@crczp/utils';
import { OsType, Topology } from '@crczp/sandbox-model';
import { mapTopologyToTopologyVisualization } from './topology-visualization-utils';
import { TOPOLOGY_CONFIG } from './topology-graph-config';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { TopologySynchronizerService } from '../divider-position/topology-synchronizer.service';

export type GraphNodeType = 'INTERNET' | 'ROUTER' | 'HOST' | 'SUBNET';

export type TopologyGraphNode = {
    id: string;
    name: string;
    nodeType: GraphNodeType;
    ip?: string;
    osType?: OsType;
    guiAccess?: boolean;
    accessible?: boolean;
    subnetColor?: string;
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

export type OpenConsoleEvent = {
    nodeId: string;
    inNewWindow: boolean;
    inGui: boolean;
    osType: OsType;
};

@Component({
    selector: 'crczp-topology-graph',
    standalone: true,
    imports: [CommonModule, Minimap, ContextMenu, FormsModule],
    templateUrl: './topology-graph.html',
    styleUrl: './topology-graph.scss',
})
export class TopologyGraph implements AfterViewInit {
    openConsole = output<OpenConsoleEvent>();

    topology = input.required<Topology>();
    loading = input<boolean>(false);
    stabilized = signal(false);
    resized = signal(true);
    @ViewChild('networkContainer', { static: false })
    networkContainer: ElementRef<HTMLDivElement>;
    network: Network;
    protected accessibleNodes = signal<string[]>([]);
    protected nodes: TopologyGraphNode[];
    protected links: TopologyGraphLink[];
    private readonly svgService = inject(TopologyNodeSvgService);
    private readonly errorHandlerService = inject(ErrorHandlerService);
    private readonly topologySynchronizerService = inject(
        TopologySynchronizerService,
    );
    private nodeNamesDict: { [key: string]: TopologyGraphNode } = {};

    constructor() {
        toObservable(this.topology).subscribe((topology) =>
            this.handleTopologyChange(topology),
        );

        this.topologySynchronizerService.topologyDimensions$.subscribe(
            (dimensions) =>
                this.handleDimensionsChange(
                    dimensions.width,
                    dimensions.height,
                ),
        );
    }

    createContextMenu(nodeId: string | number): ContextMenuItem[] {
        const node = this.nodeNamesDict[nodeId];
        if (node.nodeType === 'INTERNET' || node.nodeType === 'SUBNET') {
            return [];
        }
        return [
            {
                label: 'Open Console',
                action: () => this.emitConsoleEvent(node, false, false),
            },
            {
                label: 'Open Console in new Window',
                action: () => {
                    this.emitConsoleEvent(node, false, true);
                },
            },
        ].concat(
            node.guiAccess
                ? [
                      {
                          label: 'Open GUI',
                          action: () => {
                              this.emitConsoleEvent(node, true, false);
                          },
                      },
                      {
                          label: 'Open GUI in new Window',
                          action: () => {
                              this.emitConsoleEvent(node, true, true);
                          },
                      },
                  ]
                : [],
        );
    }

    ngAfterViewInit() {
        this.renderNetwork();
    }

    private handleDimensionsChange(width: number, height: number) {
        if (!this.networkContainer || !this.network) return;
        this.resized.set(false);
        const scaleChange =
            this.networkContainer.nativeElement.offsetWidth / width;
        const zoomAdjustment = scaleChange <= 0 ? 1 : scaleChange;

        const scale = this.network.getScale();
        const viewPosition = this.network.getViewPosition();
        this.network.moveTo({
            position: viewPosition,
            scale: scale * zoomAdjustment,
            animation: false,
        });

        if (!this.networkContainer) return;
        this.networkContainer.nativeElement.style.width = `${width}px`;
        this.networkContainer.nativeElement.style.height = `${height}px`;
    }

    private handleTopologyChange(newTopology: Topology) {
        const visualizationData =
            mapTopologyToTopologyVisualization(newTopology);
        this.nodes = visualizationData.nodes;
        this.accessibleNodes.set(
            this.nodes.filter((node) => node.accessible).map((node) => node.id),
        );
        this.nodeNamesDict = this.nodes.reduce(
            (acc, node) => ({ ...acc, [node.id]: node }),
            {},
        );
        this.links = visualizationData.links;
        this.renderNetwork();
    }

    private getNodeSize(nodeType: GraphNodeType): number {
        switch (nodeType) {
            case 'INTERNET':
                return 250;
            case 'ROUTER':
                return 110;
            case 'HOST':
                return 110;
            case 'SUBNET':
                return 220;
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

    private getPositionExtremes(): [number, number, number, number] {
        if (!this.network || this.nodes.length === 0) return [0, 0, 0, 0];

        const allNodePositions = this.nodes.map(
            (node) => this.network.getPositions([node.id])[node.id],
        );

        const xs = allNodePositions.map((pos) => pos.x);
        const ys = allNodePositions.map((pos) => pos.y);

        return [
            Math.min(...xs),
            Math.max(...xs),
            Math.min(...ys),
            Math.max(...ys),
        ];
    }

    private enforceViewportBounds(): void {
        if (!this.network || this.nodes.length === 0) return;

        const viewPosition = this.network.getViewPosition();
        const scale = this.network.getScale();

        const [minX, maxX, minY, maxY] = this.getPositionExtremes();

        const boundedX = Math.max(
            minX - 200,
            Math.min(viewPosition.x, maxX + 200),
        );
        const boundedY = Math.max(
            minY - 200,
            Math.min(viewPosition.y, maxY + 200),
        );

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
                        node.ip,
                        node.subnetColor,
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
                    node.osType,
                    node.ip,
                    node.accessible,
                    node.guiAccess,
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
                            'Topology graph',
                        );
                        console.error(err);
                        return EMPTY; // This will skip failed nodes entirely
                    }),
                );
        });

        combineLatest(svgObservables)
            .pipe(
                catchError((err) => {
                    console.error('combineLatest error:', err);
                    return of([]);
                }),
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
                    }) as Edge,
            ),
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
            TOPOLOGY_CONFIG.GRAPH,
        );

        this.network.on('stabilized', () => {
            this.stabilized.set(true);
        });

        this.network.on('afterDrawing', () => {
            this.resized.set(true);
        });

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
                this.emitConsoleEvent(event.nodes[0], false, false);
            }
        });
    }

    private emitConsoleEvent(
        topologyNode: TopologyGraphNode,
        inGui: boolean,
        inNewWindow,
    ) {
        if (!topologyNode.guiAccess && inGui) {
            throw new Error(
                'Requested GUI connection on node with no GUI access',
            );
        }
        this.openConsole.emit({
            nodeId: topologyNode.id,
            osType: topologyNode.osType,
            inNewWindow,
            inGui,
        });
    }
}
