import {
    DestroyRef,
    Injectable,
    Signal,
    effect,
    inject,
    signal,
} from '@angular/core';
import { ECharts, EChartsOption, SeriesOption, init as initEcharts } from 'echarts';
import { DRAG_RELEASE_DELAY_MS } from '../config/ui.config';
import { buildAxisFragment } from '../option-builders/axis.builder';
import { buildCurrentTimeMarkerFragment } from '../option-builders/current-time-marker.builder';
import { buildDataZoomFragment } from '../option-builders/data-zoom.builder';
import { buildGridFragment } from '../option-builders/grid.builder';
import { buildSkeletonBarsFragment } from '../option-builders/bars/skeleton-bars.builder';
import { OptionFragment } from '../types/option-fragment.types';
import { ViewModel } from '../types/view-model.types';
import { ChartRendererService } from './chart-renderer.interface.service';

/**
 * Shape of the payload echarts dispatches on `'dataZoom'` events. Modelled
 * locally because the upstream typings expose this only via a loose
 * `any`-keyed dictionary.
 */
interface DataZoomEventPayload {
    readonly start?: number;
    readonly end?: number;
    readonly batch?: ReadonlyArray<{ readonly start?: number; readonly end?: number }>;
}

/**
 * Concrete renderer. Owns the ECharts instance, dispatches view-model
 * changes as `setOption` calls, gates dispatch while the user is dragging
 * a chart control, and translates dataZoom events into the
 * `isZoomedIn` signal.
 *
 * Engine-driven motion: the view-model is stable for the lifetime of one
 * feed binding, so the view-model effect emits a single `setOption` at
 * mount. Bar right-edge growth and the current-time marker progression
 * are encoded as zrender `keyframeAnimation` entries on the rect and
 * line shapes; ECharts' RAF loop owns per-frame interpolation. On host
 * resize ECharts re-runs every custom-series `renderItem` callback,
 * which yields fresh `api.coord`-derived pixel anchors and a fresh
 * animation cycle — no explicit re-dispatch is needed.
 */
@Injectable()
export class ChartRendererServiceImpl extends ChartRendererService {
    private readonly destroyRef = inject(DestroyRef);

    private chart: ECharts | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private dragging = false;
    private pendingOption: EChartsOption | null = null;
    private dragReleaseTimer: ReturnType<typeof setTimeout> | null = null;
    private host: HTMLElement | null = null;

    private readonly internalIsZoomedIn = signal(false);
    readonly isZoomedIn: Signal<boolean> = this.internalIsZoomedIn.asReadonly();

    bind(host: HTMLElement, viewModel: Signal<ViewModel>): void {
        this.host = host;
        const chart = initEcharts(host);
        this.chart = chart;

        this.wireDragQueue(chart);
        this.wireDataZoomListener(chart);
        this.wireResizeObserver(host, chart);

        effect(() => {
            const currentViewModel = viewModel();
            const option = this.composeOption(currentViewModel);
            this.dispatch(option);
        });

        this.destroyRef.onDestroy(() => this.teardown());
    }

    resetZoom(): void {
        this.chart?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
    }

    /**
     * Composes the full ECharts option payload for one view-model
     * emission. Switches on the view-model mode tag and delegates to the
     * shared option-builders.
     *
     * @param viewModel - Current view-model emission.
     * @returns The composed option ready for `setOption`.
     */
    private composeOption(viewModel: ViewModel): EChartsOption {
        if (viewModel.mode === 'skeleton') {
            return this.composeSkeletonOption(viewModel);
        }
        throw new Error('live mode renderer not implemented');
    }

    /**
     * Builds the option for skeleton mode by running every relevant
     * builder and merging their fragments.
     *
     * @param viewModel - Skeleton view-model.
     * @returns The merged option payload.
     */
    private composeSkeletonOption(
        viewModel: Extract<ViewModel, { mode: 'skeleton' }>,
    ): EChartsOption {
        const hostWidth = this.host?.clientWidth ?? 0;
        const hostHeight = this.host?.clientHeight ?? 0;
        const placeholderCount = viewModel.placeholders.length;

        const fragments: OptionFragment[] = [
            buildAxisFragment(viewModel.axis, placeholderCount, []),
            buildSkeletonBarsFragment(viewModel.placeholders, viewModel.axis),
            buildGridFragment({
                visibleRowCount: placeholderCount,
                hostWidth,
                hostHeight,
            }),
            buildDataZoomFragment({
                totalRowCount: placeholderCount,
                visibleRowCount: placeholderCount,
                preservedZoom: null,
                preservedScrollStartIndex: null,
            }),
            buildCurrentTimeMarkerFragment(
                viewModel.axis.mountNowMs,
                viewModel.axis.endMs,
                true,
            ),
        ];

        return this.mergeFragments(fragments);
    }

    /**
     * Merges option fragments into a single option payload.
     *
     * The `series` key is special-cased: every fragment that contributes
     * a series array has its entries concatenated. All other top-level
     * keys (`xAxis`, `yAxis`, `grid`, `dataZoom`, etc.) are written once
     * — last writer wins, but no two builders should target the same
     * non-series key.
     *
     * @param fragments - Fragments produced by the option-builders.
     * @returns The merged option.
     */
    private mergeFragments(fragments: readonly OptionFragment[]): EChartsOption {
        const merged: EChartsOption = {};
        const seriesAccumulator: SeriesOption[] = [];

        for (const { fragment } of fragments) {
            for (const key of Object.keys(fragment) as Array<keyof EChartsOption>) {
                if (key === 'series') {
                    const fragmentSeries = fragment.series;
                    if (Array.isArray(fragmentSeries)) {
                        seriesAccumulator.push(...fragmentSeries);
                    } else if (fragmentSeries !== undefined) {
                        seriesAccumulator.push(fragmentSeries as SeriesOption);
                    }
                    continue;
                }
                Reflect.set(merged, key, Reflect.get(fragment, key));
            }
        }

        merged.series = seriesAccumulator;
        return merged;
    }

    /**
     * Dispatches an option to the chart, or queues it if a drag gesture
     * is currently in flight. Always uses `replaceMerge: ['series']` so
     * series counts shrink correctly on mode switches.
     *
     * @param option - The option payload to dispatch.
     */
    private dispatch(option: EChartsOption): void {
        if (!this.chart) {
            return;
        }
        if (this.dragging) {
            this.pendingOption = option;
            return;
        }
        this.chart.setOption(option, { replaceMerge: ['series'] });
    }

    /**
     * Hooks ZRender pointer events so that option dispatches issued
     * during a drag are queued and applied once the drag releases.
     *
     * @param chart - The bound ECharts instance.
     */
    private wireDragQueue(chart: ECharts): void {
        const zrender = chart.getZr();
        zrender.on('mousedown', () => {
            this.dragging = true;
            if (this.dragReleaseTimer !== null) {
                clearTimeout(this.dragReleaseTimer);
                this.dragReleaseTimer = null;
            }
        });
        zrender.on('mouseup', () => {
            if (this.dragReleaseTimer !== null) {
                clearTimeout(this.dragReleaseTimer);
            }
            this.dragReleaseTimer = setTimeout(() => {
                this.dragging = false;
                this.dragReleaseTimer = null;
                this.drainPendingOption();
            }, DRAG_RELEASE_DELAY_MS);
        });
    }

    /**
     * Applies the queued option, if any, after a drag releases.
     */
    private drainPendingOption(): void {
        if (this.pendingOption === null || !this.chart) {
            return;
        }
        const option = this.pendingOption;
        this.pendingOption = null;
        this.chart.setOption(option, { replaceMerge: ['series'] });
    }

    /**
     * Subscribes to `'dataZoom'` events and reflects the resulting zoom
     * state into the `isZoomedIn` signal. Calls `off` first to keep
     * listeners deduped if `bind` is ever called twice.
     *
     * @param chart - The bound ECharts instance.
     */
    private wireDataZoomListener(chart: ECharts): void {
        chart.off('dataZoom');
        chart.on('dataZoom', (event: unknown) => {
            const payload = event as DataZoomEventPayload;
            const { start, end } = this.resolveZoomRange(payload);
            if (start === null || end === null) {
                return;
            }
            this.internalIsZoomedIn.set(start !== 0 || end !== 100);
        });
    }

    /**
     * Extracts the effective horizontal zoom range from a `dataZoom`
     * event payload. Echarts emits either a top-level `start`/`end` pair
     * or a `batch` array; this normalises both shapes.
     *
     * @param payload - Raw event payload.
     * @returns The resolved `start`/`end` percentages, or `null` slots
     *          when the event does not carry usable values.
     */
    private resolveZoomRange(
        payload: DataZoomEventPayload,
    ): { start: number | null; end: number | null } {
        if (typeof payload.start === 'number' && typeof payload.end === 'number') {
            return { start: payload.start, end: payload.end };
        }
        const firstBatchEntry = payload.batch?.[0];
        if (
            firstBatchEntry !== undefined &&
            typeof firstBatchEntry.start === 'number' &&
            typeof firstBatchEntry.end === 'number'
        ) {
            return { start: firstBatchEntry.start, end: firstBatchEntry.end };
        }
        return { start: null, end: null };
    }

    /**
     * Observes the host element's size and forwards resize events to the
     * chart. Stored on the instance so teardown can disconnect it.
     *
     * @param host - The chart container element.
     * @param chart - The bound ECharts instance.
     */
    private wireResizeObserver(host: HTMLElement, chart: ECharts): void {
        const resizeObserver = new ResizeObserver(() => chart.resize());
        resizeObserver.observe(host);
        this.resizeObserver = resizeObserver;
    }

    /**
     * Releases every resource the renderer owns: pending drag timer,
     * resize observer, and the chart instance itself.
     */
    private teardown(): void {
        if (this.dragReleaseTimer !== null) {
            clearTimeout(this.dragReleaseTimer);
            this.dragReleaseTimer = null;
        }
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.chart?.dispose();
        this.chart = null;
        this.host = null;
        this.pendingOption = null;
        this.dragging = false;
    }
}
