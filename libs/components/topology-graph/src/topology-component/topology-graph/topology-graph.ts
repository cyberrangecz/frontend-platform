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
    ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsoleTab } from '../../model/model';
import { Edge, Network, Options } from 'vis-network';
import { Minimap } from '../minimap/minimap';
import { ContextMenu } from '../context-menu/context-menu';
import { Topology } from '@crczp/sandbox-model';
import { TopologyGraphNode } from '../topology-vis-types';
import { TopologyVisualizationMapperService } from '../services/topology-visualization-mapper-service';
import { TopologyNodeSvgService } from '../services/topology-svg-generator.service';

@Component({
    selector: 'crczp-topology-graph',
    standalone: true,
    imports: [CommonModule, Minimap, ContextMenu],
    providers: [TopologyNodeSvgService, TopologyVisualizationMapperService],
    templateUrl: './topology-graph.html',
    styleUrl: './topology-graph.scss',
})
export class TopologyGraph implements OnChanges, AfterViewInit {
    @Output() openConsole = new EventEmitter<ConsoleTab>();

    @Input({ required: true }) topology: Topology;
    @ViewChild('networkContainer', { static: false })
    networkContainer: ElementRef;
    network: Network;

    private readonly mapperService = inject(TopologyVisualizationMapperService);

    private nodes: TopologyGraphNode[];
    private links: Edge[];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['topology']) {
            this.mapperService
                .mapTopologyToTopologyVisualization(this.topology)
                .subscribe(
                    ({ nodes, links }) => {
                        this.nodes = nodes;
                        this.links = links;
                        this.instantiateNetwork();
                    },
                    (_err) => {},
                    () => {
                        console.log('completed render');
                    }
                );
        }
    }

    ngAfterViewInit() {
        this.instantiateNetwork();
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

    private instantiateNetwork(): void {
        if (!this.networkContainer || !this.nodes || !this.links) {
            return;
        }

        const data = {
            nodes: this.nodes,
            edges: this.links,
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
                    gravitationalConstant: -2000,
                    springConstant: 0.2,
                    springLength: 300,
                    theta: 0.4,
                    damping: 0.2,
                },
                stabilization: {
                    iterations: 100,
                },
                solver: 'barnesHut',
                adaptiveTimestep: true,
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
        //
        // // Event handlers
        // this.network.on('dragEnd', () => {
        //     this.enforceViewportBounds();
        // });
        //
        // this.network.on('zoom', () => {
        //     this.enforceZoomLimits();
        //     this.enforceViewportBounds();
        // });
    }
}
