import { Injectable, Signal, signal, WritableSignal } from '@angular/core';
import {
    CHART_BOTTOM_RESERVE_PX,
    CHART_TOP_RESERVE_PX,
    ROW_HEIGHT_PX,
    VISIBLE_ROW_COUNT,
} from '../config/ui.config';
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

    /** Backing signal for {@link innerHostHeightPx}, written by the chart component per trainee count. */
    readonly innerHostHeightState: WritableSignal<number> = signal(
        VISIBLE_ROW_COUNT * ROW_HEIGHT_PX + CHART_TOP_RESERVE_PX + CHART_BOTTOM_RESERVE_PX,
    );
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
