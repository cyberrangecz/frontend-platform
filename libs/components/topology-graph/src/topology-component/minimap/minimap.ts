import { Component, ElementRef, Input, OnChanges, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Network } from 'vis-network';
import { Subject, takeUntil, timer } from 'rxjs';

@Component({
    selector: 'crczp-minimap',
    imports: [CommonModule],
    templateUrl: './minimap.html',
    styleUrl: './minimap.scss',
})
export class Minimap implements OnChanges {
    @Input({ required: true }) network: Network;
    @Input({ required: true }) parentContainer: ElementRef<HTMLDivElement>;
    dragging = signal(false);
    cancelDragDisable = new Subject<void>();
    private readonly PERCENT_SIZE = 1;
    private readonly MAX_SIZE = 500;
    private readonly FADEOUT_DURATION = 500;
    @ViewChild('minimapCanvas', { static: true })
    private minimapCanvasRef!: ElementRef<HTMLCanvasElement>;

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

        const nodePositions = Object.values(this.network.getPositions());
        if (nodePositions.length === 0) return;

        const viewCenter = this.network.getViewPosition();
        const scaleFactor = this.network.getScale();
        const viewportWidth = container.offsetWidth / scaleFactor;
        const viewportHeight = container.offsetHeight / scaleFactor;

        const viewLeft = viewCenter.x - viewportWidth / 2;
        const viewRight = viewCenter.x + viewportWidth / 2;
        const viewTop = viewCenter.y - viewportHeight / 2;
        const viewBottom = viewCenter.y + viewportHeight / 2;

        const xs = nodePositions.map((p) => p.x);
        const ys = nodePositions.map((p) => p.y);

        const margin = 20;

        const minX = Math.min(...xs, viewLeft) - margin;
        const maxX = Math.max(...xs, viewRight) + margin;
        const minY = Math.min(...ys, viewTop) - margin;
        const maxY = Math.max(...ys, viewBottom) + margin;

        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;

        const scaleX = width / graphWidth;
        const scaleY = height / graphHeight;
        const scale = Math.min(scaleX, scaleY); // Preserve aspect ratio

        const offsetX = (width - graphWidth * scale) / 2;
        const offsetY = (height - graphHeight * scale) / 2;

        // Draw nodes
        ctx.fillStyle = '#004';
        for (const pos of nodePositions) {
            const x = (pos.x - minX) * scale + offsetX;
            const y = (pos.y - minY) * scale + offsetY;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Draw viewport rectangle
        const rectX = (viewLeft - minX) * scale + offsetX;
        const rectY = (viewTop - minY) * scale + offsetY;
        const rectW = viewportWidth * scale;
        const rectH = viewportHeight * scale;

        ctx.strokeStyle = '#3f51b5';
        ctx.lineWidth = 1;
        ctx.strokeRect(rectX, rectY, rectW, rectH);
    }
}
