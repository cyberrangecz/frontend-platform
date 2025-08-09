import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphNode, GraphNodeLink } from '@crczp/sandbox-model';
import { ConsoleTab } from '../../model/model';
import { Network, Options } from 'vis-network';
import { DataSet } from 'vis-data';
import { Minimap } from '../minimap/minimap';
import { ContextMenu, ContextMenuItem } from '../context-menu/context-menu';

@Component({
    selector: 'crczp-topology-graph',
    standalone: true,
    imports: [CommonModule, Minimap, ContextMenu],
    templateUrl: './topology-graph.html',
    styleUrl: './topology-graph.scss',
})
export class TopologyGraph implements AfterViewInit, OnChanges {
    @Output() openConsole = new EventEmitter<ConsoleTab>();
    @Input({ required: true }) nodes: GraphNode[] = [];
    @Input({ required: true }) links: GraphNodeLink[] = [];
    @Input() minimapEnabled = true;
    @Input() viewportMargin = 200;
    @Input() minimapMaxSize = 200;
    @Input() minimapScale = 1;
    @Input() minimapFadeOutDuration = 500;
    @Input() consoles: any[] = [];
    @Input() minZoom = 0.4;
    @Input() maxZoom = 2;

    @ViewChild('networkContainer', { static: false })
    networkContainer: ElementRef;
    network: Network;

    ngAfterViewInit(): void {
        this.renderNetwork();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['nodes'] || changes['links']) {
            this.renderNetwork();
        }
    }

    handleOpenConsole(nodeName: ContextMenuItem): void {
        console.log(nodeName);
    }

    private enforceViewportBounds(): void {
        const viewPosition = this.network.getViewPosition(); // {x, y}
        const scale = this.network.getScale();

        const allNodePositions = this.nodes.map(
            (node) => this.network.getPositions([node.name])[node.name]
        );

        const xs = allNodePositions.map((pos) => pos.x);
        const ys = allNodePositions.map((pos) => pos.y);

        const minX = Math.min(...xs) - this.viewportMargin;
        const maxX = Math.max(...xs) + this.viewportMargin;
        const minY = Math.min(...ys) - this.viewportMargin;
        const maxY = Math.max(...ys) + this.viewportMargin;

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
        const scale = this.network.getScale();

        if (scale < this.minZoom || scale > this.maxZoom) {
            const viewPosition = this.network.getViewPosition();
            this.network.moveTo({
                position: viewPosition,
                scale: Math.max(this.minZoom, Math.min(scale, this.maxZoom)),
                animation: false,
            });
        }
    }

    private renderNetwork(): void {
        if (!this.networkContainer) return;

        const visNodes = new DataSet(
            this.nodes.map((node) => ({
                id: node.name,
                shape: 'image',
                image: `/assets/topology-graph/${node.nodeType}.svg`,
                label: node.name,
                size: 30,
            }))
        );

        const visEdges = new DataSet(
            this.links.map((link) => ({
                id: link.nodeA.name + link.nodeB.name,
                from: link.nodeA.name,
                to: link.nodeB.name,
            }))
        );

        const data = {
            nodes: visNodes,
            edges: visEdges,
        };

        const options: Options = {
            edges: {
                color: '#002776',
                smooth: false,
            },
            physics: {
                barnesHut: {
                    centralGravity: 0.5,
                    gravitationalConstant: -10000,
                    springConstant: 0.2,
                    theta: 0.2,
                    damping: 0.2,
                },
                stabilization: {
                    iterations: 2500,
                },
            },
        };

        this.network = new Network(
            this.networkContainer.nativeElement,
            data,
            options
        );

        this.network.on('dragEnd', () => {
            this.enforceViewportBounds();
        });

        this.network.on('zoom', () => {
            this.enforceZoomLimits();
            this.enforceViewportBounds();
        });
    }
}
