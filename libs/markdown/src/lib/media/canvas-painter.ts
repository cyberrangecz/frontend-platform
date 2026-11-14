/**
 * Draws an animation on a canvas kept at the device's pixel density: the canvas follows its
 * element's size, and every requested animation frame draws once and asks for the next frame for
 * as long as the animation runs.
 */
export abstract class CanvasPainter {
    protected readonly context: CanvasRenderingContext2D;
    /** Canvas width in CSS pixels. */
    protected width = 0;
    /** Canvas height in CSS pixels. */
    protected height = 0;
    private readonly resizeObserver: ResizeObserver;
    private frameRequest: number | null = null;

    protected constructor(protected readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('A 2D canvas context is not available');
        }
        this.context = context;
        this.resizeObserver = new ResizeObserver(([entry]) => entry && this.resize(entry.contentRect));
        this.resizeObserver.observe(canvas);
    }

    destroy(): void {
        if (this.frameRequest !== null) {
            cancelAnimationFrame(this.frameRequest);
        }
        this.resizeObserver.disconnect();
    }

    /** Draws one frame. */
    protected abstract draw(now: number): void;

    /** Whether the animation runs on after the frame drawn at the given time. */
    protected abstract animating(now: number): boolean;

    /** Called once the animation has come to rest. */
    protected rested(): void {
        return;
    }

    /** Called after the canvas took a new size. */
    protected resized(): void {
        return;
    }

    protected requestFrame(): void {
        this.frameRequest ??= requestAnimationFrame((now) => {
            this.frameRequest = null;
            this.draw(now);
            if (this.animating(now)) {
                this.requestFrame();
            } else {
                this.rested();
            }
        });
    }

    private resize({ width, height }: DOMRectReadOnly): void {
        const ratio = devicePixelRatio || 1;
        this.width = width;
        this.height = height;
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
        this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.resized();
        this.requestFrame();
    }
}
