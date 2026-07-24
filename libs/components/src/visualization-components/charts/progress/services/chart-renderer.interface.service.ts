import { Signal } from '@angular/core';

/**
 * Shared state bridge between the declaratively-mounted progress chart and the
 * surrounding visualization shell.
 *
 * The chart component owns the live ECharts instance and mounts it through
 * ngx-echarts' `[options]` binding; this holder exposes the few cross-component
 * values the shell's reset-zoom FAB row needs — the current zoom state, the
 * inner-host pixel height that positions the FAB, and an imperative zoom reset —
 * without the shell reaching into the chart instance directly.
 *
 * Provided at `<crczp-progress-visualization>` scope so two charts on the same
 * page keep independent state.
 *
 * Boundaries:
 *  - no ECharts ownership; the chart component holds the instance and writes here
 *  - no business logic; classification/ordering live in selectors
 *  - no DOM manipulation
 */
export abstract class ChartRendererService {
    /** `true` while the chart's current horizontal zoom is anything other than 0–100%. */
    abstract readonly isZoomedIn: Signal<boolean>;

    /**
     * Pixel height the inner chart container is sized to, derived from the
     * current trainee count and the fixed visible-row window. Consumed by the
     * shell to position the reset-zoom FAB row.
     */
    abstract readonly innerHostHeightPx: Signal<number>;

    /**
     * Records whether the chart's current horizontal zoom is anything other than
     * the full 0–100% range.
     *
     * @param value - `true` when the chart is zoomed in, `false` when at full range.
     */
    abstract setZoomedIn(value: boolean): void;

    /**
     * Records the pixel height the inner chart container is sized to.
     *
     * @param heightPx - Container height in pixels derived from the current trainee count.
     */
    abstract setInnerHostHeightPx(heightPx: number): void;

    /**
     * Registers the action invoked by {@link resetZoom}. Must be called by the
     * chart component after it captures its live ECharts instance.
     *
     * @param handler - Action that resets the horizontal zoom on the live chart.
     */
    abstract registerResetZoom(handler: () => void): void;

    /** Resets the horizontal zoom to the full 0–100% range. */
    abstract resetZoom(): void;
}
