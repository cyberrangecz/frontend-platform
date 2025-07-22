import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {GraphNode, GraphNodeLink} from "@crczp/sandbox-model";
import {ConsoleTab} from "../../model/model";
import {Network, Options} from 'vis-network';
import {DataSet} from 'vis-data';


@Component({
    selector: 'crczp-topology-graph',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './topology-graph.html',
    styleUrl: './topology-graph.scss',
})
export class TopologyGraph implements AfterViewInit, OnChanges {
    @Output() openConsole = new EventEmitter<ConsoleTab>();
    @Input() nodes: GraphNode[] = [];
    @Input() links: GraphNodeLink[] = [];

    @ViewChild('networkContainer', {static: false}) networkContainer?: ElementRef;

    private network?: Network;
    private nodePositions = new Map<string, { x: number; y: number }>();


    ngAfterViewInit(): void {
        this.renderNetwork();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['nodes'] || changes['links']) {
            this.renderNetwork();
        }
    }

    private generateNodeSVG(name: string, type: string): string {
        const iconHref = `/assets/topology-graph/${type}.svg`; // or use a base64 data URI
        const width = 80;
        const height = 40;

        return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width}" height="${height}" rx="10" ry="10"
          fill="#007acc" stroke="#004c99" stroke-width="2" />
    <image href="${iconHref}" x="6" y="4" height="32" width="32" />
    <text x="${width / 2}" y="${height - 8}" text-anchor="middle"
          font-family="Arial" font-size="12" fill="#ffffff" font-weight="bold">
        ${name}
    </text>
</svg>
`;
    }

    private svgToDataUrl(svg: string): string {
        const encoded = encodeURIComponent(svg)
            .replace(/'/g, '%27')
            .replace(/"/g, '%22');
        return `data:image/svg+xml;charset=utf-8,${encoded}`;
    }

    private renderNetwork(): void {
        if (!this.networkContainer) return;

        const visNodes = new DataSet(
            this.nodes.map(node => ({
                id: node.name,
                shape: 'image',
                image: `/assets/topology-graph/${node.nodeType}.svg`,
                label: node.name,
                size: 30,
            }))
        );

        const visEdges = new DataSet(
            this.links.map(link => ({
                id: link.id,
                from: link.source.name,
                to: link.target.name,
            }))
        );

        const data = {
            nodes: visNodes,
            edges: visEdges
        };

        const options: Options = {
            edges: {
                color: "#002776",
                smooth: false,
            },
            physics: {
                barnesHut: {gravitationalConstant: -30000},
                stabilization: {iterations: 2500},
            },
        };

        this.network = new Network(this.networkContainer.nativeElement, data, options);

      
    }
}
