import {
    Component,
    ElementRef,
    inject,
    Input,
    OnChanges,
    OnInit,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network } from 'vis-network';
import { Subject, takeUntil, timer } from 'rxjs';
import {
    GraphNodeType,
    TopologyGraphNode,
} from '../topology-graph/topology-graph';
import { TopologyIconsService } from '../topology-graph/services/topology-icons.service';

@Component({
    selector: 'crczp-minimap',
    imports: [CommonModule],
    templateUrl: './minimap.html',
    styleUrl: './minimap.scss',
})
export class Minimap implements OnChanges, OnInit {
    @Input({ required: true }) network: Network;
    @Input({ required: true }) parentContainer: ElementRef<HTMLDivElement>;
    @Input({ required: true }) nodes: TopologyGraphNode[];
    @Input({ required: true }) edges: { from: string; to: string }[];
    dragging = signal(false);
    cancelDragDisable = new Subject<void>();

    private readonly topologyIconsService = inject(TopologyIconsService);
    private readonly PERCENT_SIZE = 1;
    private readonly MAX_SIZE = 500;
    private readonly FADEOUT_DURATION = 500;
    @ViewChild('minimapCanvas', { static: true })
    private minimapCanvasRef!: ElementRef<HTMLCanvasElement>;
    private readonly NODE_SIZES: { [key in GraphNodeType]: number } = {
        INTERNET: 24,
        ROUTER: 48,
        SUBNET: 12,
        HOST: 40,
    };

    private windowsImage = new Image();
    private linuxImage = new Image();

    ngOnInit() {
        this.windowsImage.src =
            this.topologyIconsService.getPreloadedIcon('WINDOWS_NO_BG');
        this.linuxImage.src =
            this.topologyIconsService.getPreloadedIcon('LINUX_NO_BG');
    }

    ngOnChanges(): void {
        if (!this.parentContainer?.nativeElement) {
            console.warn('Minimap: parentContainer is not set');
            return;
        }
        this.updateMinimapSize();
        window.addEventListener('resize', () => this.updateMinimapSize());

        this.network.on('afterDrawing', () => {
            this.renderMinimap();
        });

        this.network.on('dragStart', () => {
            this.cancelDragDisable.next();
            this.dragging.set(true);
        });

        this.network.on('zoom', () => {
            this.cancelDragDisable.next();
            this.dragging.set(true);
            timer(this.FADEOUT_DURATION)
                .pipe(takeUntil(this.cancelDragDisable))
                .subscribe(() => {
                    this.dragging.set(false);
                });
        });

        this.network.on('dragEnd', () => {
            timer(this.FADEOUT_DURATION)
                .pipe(takeUntil(this.cancelDragDisable))
                .subscribe(() => {
                    this.dragging.set(false); // Triggers fade-out
                });
        });
    }

    private updateMinimapSize(): void {
        const canvas = this.minimapCanvasRef.nativeElement;
        const container = this.parentContainer.nativeElement;

        if (!canvas || !container) {
            console.warn('Minimap: canvas or container missing');
            return;
        }

        const containerRatio = container.offsetWidth / container.offsetHeight;
        const maxWidth = Math.min(
            canvas.width * this.PERCENT_SIZE,
            this.MAX_SIZE
        );
        const maxHeight = Math.min(
            canvas.height * this.PERCENT_SIZE,
            this.MAX_SIZE
        );

        if (containerRatio >= 2) {
            canvas.width = maxWidth;
            canvas.height = Math.round(maxWidth / containerRatio);
        } else {
            canvas.height = maxHeight;
            canvas.width = Math.round(maxHeight * containerRatio);
        }

        this.renderMinimap();
    }

    private renderMinimap(): void {
        if (this.nodes.length === 0) return;
        const canvas = this.minimapCanvasRef.nativeElement;
        const container = this.parentContainer.nativeElement;

        if (!canvas || !container) {
            console.warn('Minimap: canvas or container missing');
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const positionsDict = this.network.getPositions(
            this.nodes.map((node) => node.id)
        );

        const viewCenter = this.network.getViewPosition();
        const scaleFactor = this.network.getScale();
        const viewportWidth = container.offsetWidth / scaleFactor;
        const viewportHeight = container.offsetHeight / scaleFactor;

        const viewLeft = viewCenter.x - viewportWidth / 2;
        const viewRight = viewCenter.x + viewportWidth / 2;
        const viewTop = viewCenter.y - viewportHeight / 2;
        const viewBottom = viewCenter.y + viewportHeight / 2;

        const positionValues = Object.values(positionsDict);

        const xs = positionValues.map((p) => p.x);
        const ys = positionValues.map((p) => p.y);

        const margin = 20;

        const minX = Math.min(...xs, viewLeft) - margin;
        const maxX = Math.max(...xs, viewRight) + margin;
        const minY = Math.min(...ys, viewTop) - margin;
        const maxY = Math.max(...ys, viewBottom) + margin;

        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;

        const scaleX = width / graphWidth;
        const scaleY = height / graphHeight;
        const scale = Math.min(scaleX, scaleY);

        const offsetX = (width - graphWidth * scale) / 2;
        const offsetY = (height - graphHeight * scale) / 2;

        for (const edge of this.edges) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#a2a3a3';
            const startX =
                (positionsDict[edge.from].x - minX) * scale + offsetX;
            const startY =
                (positionsDict[edge.from].y - minY) * scale + offsetY;
            const endX = (positionsDict[edge.to].x - minX) * scale + offsetX;
            const endY = (positionsDict[edge.to].y - minY) * scale + offsetY;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        const minimapNodesZoom = scaleFactor;
        for (const node of this.nodes) {
            ctx.fillStyle = node.subnetColor;

            const x = (positionsDict[node.id].x - minX) * scale + offsetX;
            const y = (positionsDict[node.id].y - minY) * scale + offsetY;
            ctx.beginPath();

            if (node.nodeType === 'SUBNET') {
                ctx.arc(
                    x,
                    y,
                    this.NODE_SIZES[node.nodeType] * minimapNodesZoom,
                    0,
                    2 * Math.PI
                );
            } else if (node.nodeType === 'INTERNET') {
                ctx.fillStyle = '#636363';
                ctx.arc(
                    x,
                    y,
                    this.NODE_SIZES[node.nodeType] * minimapNodesZoom,
                    0,
                    2 * Math.PI
                );
            } else {
                const img = new Image();
                img.src = this.topologyIconsService.getPreloadedIcon(
                    node.osType
                );
                ctx.drawImage(
                    node.osType === 'WINDOWS'
                        ? this.windowsImage
                        : this.linuxImage,
                    x - (this.NODE_SIZES[node.nodeType] * minimapNodesZoom) / 2,
                    y - (this.NODE_SIZES[node.nodeType] * minimapNodesZoom) / 2,
                    this.NODE_SIZES[node.nodeType] * minimapNodesZoom,
                    this.NODE_SIZES[node.nodeType] * minimapNodesZoom
                );
            }

            ctx.fill();
        }

        const rectX = (viewLeft - minX) * scale + offsetX;
        const rectY = (viewTop - minY) * scale + offsetY;
        const rectW = viewportWidth * scale;
        const rectH = viewportHeight * scale;

        ctx.strokeStyle = '#3f51b5';
        ctx.lineWidth = 1;
        const cornerRadius = 8;

        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectW, rectH, cornerRadius);
        ctx.closePath();
        ctx.stroke();
    }

    private getNodeColour(node: TopologyGraphNode): string {
        switch (node.nodeType) {
            case 'INTERNET':
                return '#81858c';
            case 'SUBNET':
                return '#ffffff';
            case 'HOST':
            case 'ROUTER': {
                if (!node.osType) {
                    return '#aa8d8d';
                }
                if (node.osType === 'LINUX') {
                    return '#ffed00';
                }
                return '#0db2ff';
            }
        }
    }
}
