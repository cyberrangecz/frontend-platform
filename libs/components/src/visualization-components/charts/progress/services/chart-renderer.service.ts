import { Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { MIN_CANVAS_HEIGHT_PX } from '../option-builders/row-layout';
import { ChartRendererService } from './chart-renderer.interface.service';

/**
 * Slim shared-state holder backing {@link ChartRendererService}.
 *
 * Holds the cross-component signals the chart component writes and the shell
 * reads, and forwards the reset-zoom action to a delegate the chart component
 * registers once it has captured its ECharts instance. Owns no chart instance,
 * no timers, and no DOM.
 */
@Injectable()
export class ChartRendererServiceImpl extends ChartRendererService {
    /** Backing signal for {@link isZoomedIn}, written by the chart component on `dataZoom`. */
    readonly isZoomedInState: WritableSignal<boolean> = signal(false);
    readonly isZoomedIn: Signal<boolean> = this.isZoomedInState.asReadonly();

    /**
     * Backing signal for {@link innerHostHeightPx}, written by the chart component
     * per trainee count and seeded with the smallest chart the layout produces.
     */
    readonly innerHostHeightState: WritableSignal<number> = signal(MIN_CANVAS_HEIGHT_PX);
    readonly innerHostHeightPx: Signal<number> = this.innerHostHeightState.asReadonly();

    /** Zoom-reset delegate supplied by the chart component once its instance is live. */
    private resetZoomDelegate: (() => void) | null = null;

    setZoomedIn(value: boolean): void {
        this.isZoomedInState.set(value);
    }

    setInnerHostHeightPx(heightPx: number): void {
        this.innerHostHeightState.set(heightPx);
    }

    registerResetZoom(handler: () => void): void {
        this.resetZoomDelegate = handler;
    }

    resetZoom(): void {
        this.resetZoomDelegate?.();
    }
}
