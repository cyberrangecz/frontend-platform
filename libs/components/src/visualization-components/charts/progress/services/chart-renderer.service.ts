import {
    DestroyRef,
    Injectable,
    Injector,
    NgZone,
    Signal,
    effect,
    inject,
    signal,
} from '@angular/core';
import { format as dateFnsFormat } from 'date-fns';
import { ECharts, EChartsOption, SeriesOption, graphic, init as initEcharts } from 'echarts';
import { LAG_STATE_COLORS, LAG_STATE_LABELS } from '../config/lag.config';
import {
    AXIS_REFRESH_THRESHOLD_MS,
    AXIS_WATCHDOG_INTERVAL_MS,
    CHART_BOTTOM_RESERVE_PX,
    CHART_TOP_RESERVE_PX,
    CURRENT_TIME_MARKER_LINE_COLOR,
    CURRENT_TIME_MARKER_LINE_WIDTH,
    DRAG_RELEASE_DELAY_MS,
    LEGEND_ALIGN_RIGHT_BELOW_PX,
    ROW_HEIGHT_PX,
} from '../config/ui.config';
import { buildAxisFragment } from '../option-builders/axis.builder';
import {
    HORIZONTAL_INSIDE_DATAZOOM_ID,
    HORIZONTAL_SLIDER_DATAZOOM_ID,
    VERTICAL_INSIDE_DATAZOOM_ID,
    VERTICAL_SCROLLBAR_DATAZOOM_ID,
    buildDataZoomFragment,
} from '../option-builders/data-zoom.builder';
import { GRID_LEFT_PX, GRID_RIGHT_PX, buildGridFragment } from '../option-builders/grid.builder';
import {
    buildBarsFragment,
    resolveRunningBarEffectiveState,
} from '../option-builders/bars/bars.builder';
import { resolveBarHeightPx } from '../option-builders/bars/bar-geometry';
import { buildEstimateOverlayFragment } from '../option-builders/bars/estimate-overlay.builder';
import { buildEventIconsFragment } from '../option-builders/event-icons.builder';
import { buildRunCapsFragment } from '../option-builders/run-caps.builder';
import {
    LegendVm,
    buildLegendFragment,
    buildLegendPartialOption,
} from '../option-builders/legend.builder';
import { buildTooltipFragment } from '../option-builders/tooltip.builder';
import { OptionFragment } from '../types/option-fragment.types';
import { BarKey } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import { LegendItemVm, ViewModel } from '../types/view-model.types';
import { ChartRendererService } from './chart-renderer.interface.service';
import { LegendTransitionSchedulerService } from './legend-transition-scheduler.service';
import { ProgressFeedService } from './progress-feed.interface.service';
import { ProgressUiStateService } from './progress-ui-state.interface.service';

/**
 * Reverse map from human-readable legend label to the corresponding
 * `LagState` enum value. Built once at module load from `LAG_STATE_LABELS`.
 */
const LABEL_TO_LAG_STATE = new Map<string, LagState>(
    Object.entries(LAG_STATE_LABELS).map(([state, label]) => [label, state as LagState]),
);

/**
 * Shape of a single entry inside the `batch` array that ECharts emits on
 * `'dataZoom'` events. Each entry corresponds to one data-zoom component
 * and is identified by its stable `id`.
 */
interface DataZoomBatchEntry {
    readonly dataZoomId?: string;
    readonly start?: number;
    readonly end?: number;
    readonly startValue?: number;
    readonly endValue?: number;
}

/**
 * Shape of a single dataZoom component as returned by `chart.getOption()`.
 * Component options use `id` (not `dataZoomId` like event payloads do).
 */
interface DataZoomComponentState {
    readonly id?: string;
    readonly startValue?: number;
    readonly endValue?: number;
}

/**
 * Shape of the payload echarts dispatches on `'dataZoom'` events. Modelled
 * locally because the upstream typings expose this only via a loose
 * `any`-keyed dictionary.
 *
 * ECharts always emits a `batch` array even when a single component fires;
 * the top-level `start`/`end` fields are only present for non-batch events
 * triggered by a slider that does not share an axis with another component.
 */
interface DataZoomEventPayload {
    readonly dataZoomId?: string;
    readonly start?: number;
    readonly end?: number;
    readonly startValue?: number;
    readonly endValue?: number;
    readonly batch?: ReadonlyArray<DataZoomBatchEntry>;
}

/**
 * Shape of the payload echarts dispatches on `'legendselectchanged'` events.
 */
interface LegendSelectChangedPayload {
    readonly name: string;
    readonly selected: Readonly<Record<string, boolean>>;
}

/**
 * Shape of the payload echarts dispatches on `'click'` events for axis labels.
 * `value` is the category string when `yAxis.type` is `'category'`.
 * `dataIndex` is the numeric index of the clicked category in `yAxis.data`.
 */
interface AxisLabelClickPayload {
    readonly componentType: string;
    readonly targetType: string;
    readonly value: string | number;
    readonly dataIndex: number;
}

/**
 * Concrete renderer. Owns the ECharts instance, dispatches view-model
 * changes as `setOption` calls, gates dispatch while the user is dragging
 * a chart control, and translates dataZoom events into the
 * `isZoomedIn` signal.
 *
 * Running-bar motion: the growing right edge of each in-progress bar is an
 * imperative `graphic.Rect` overlay, one per running bar, repositioned on a
 * 4Hz timer and after every `setOption`, resize, and `dataZoom` event.
 * Pixel anchors are resolved through `convertToPixel` against the live
 * xAxis transform, so the fills stay correct under zoom and scroll without
 * a view-model re-emission.
 *
 * The current-time marker uses the same imperative subsystem: a pair of
 * zrender elements (a `Line` + a `Text` clock label) driven by the same
 * timer and the same post-event repositioning. Both subsystems convert
 * `Date.now()` through `convertToPixel`, which makes them zoom-immune and
 * avoids the pixel-bake divergence of engine-animated series.
 */
@Injectable()
export class ChartRendererServiceImpl extends ChartRendererService {
    private readonly destroyRef = inject(DestroyRef);
    private readonly injector = inject(Injector);
    private readonly uiState = inject(ProgressUiStateService);
    private readonly legendScheduler = inject(LegendTransitionSchedulerService);
    private readonly feed = inject(ProgressFeedService);
    private readonly ngZone = inject(NgZone);

    private chart: ECharts | null = null;
    private outerResizeObserver: ResizeObserver | null = null;
    private innerResizeObserver: ResizeObserver | null = null;
    private dragging = false;
    private pendingOption: EChartsOption | null = null;
    private pendingLegend: readonly LegendItemVm[] | null = null;
    private dragReleaseTimer: ReturnType<typeof setTimeout> | null = null;
    private watchdogTimer: ReturnType<typeof setInterval> | null = null;
    private outerHost: HTMLElement | null = null;
    private viewModel: Signal<ViewModel | null> | null = null;
    private currentHorizontalZoom: { startPct: number; endPct: number } | null = null;
    private currentVerticalScroll: number | null = null;

    private currentTimeMarkerLine: InstanceType<typeof graphic.Line> | null = null;
    private currentTimeMarkerText: InstanceType<typeof graphic.Text> | null = null;
    private currentTimeMarkerTimer: ReturnType<typeof setInterval> | null = null;

    private readonly runningBarFills = new Map<BarKey, InstanceType<typeof graphic.Rect>>();

    private readonly internalIsZoomedIn = signal(false);
    readonly isZoomedIn: Signal<boolean> = this.internalIsZoomedIn.asReadonly();

    private readonly internalVisibleRowCount = signal(1);
    private readonly internalHostWidth = signal(0);
    private readonly internalInnerHostHeightPx = signal(ROW_HEIGHT_PX + CHART_TOP_RESERVE_PX + CHART_BOTTOM_RESERVE_PX);
    readonly innerHostHeightPx: Signal<number> = this.internalInnerHostHeightPx.asReadonly();

    bind(outerHost: HTMLElement, innerHost: HTMLElement, viewModel: Signal<ViewModel | null>): void {
        this.outerHost = outerHost;
        this.viewModel = viewModel;
        this.internalHostWidth.set(outerHost.clientWidth);
        const chart = initEcharts(innerHost);
        this.chart = chart;

        this.wireDragQueue(chart);
        this.wireDataZoomListener(chart);
        this.wireLegendListener(chart);
        this.wireYAxisLabelClickListener(chart);
        this.wireOuterResizeObserver(outerHost);
        this.wireInnerResizeObserver(innerHost, chart);

        effect(
            () => {
                this.internalVisibleRowCount();
                this.internalHostWidth();
                const currentViewModel = viewModel();
                if (currentViewModel === null) {
                    return;
                }
                const option = this.composeOption(currentViewModel);
                this.dispatch(option);
                this.armLegendScheduler(currentViewModel);
            },
            { injector: this.injector },
        );

        this.startWatchdog();
        this.startCurrentTimeMarker(chart);
        this.destroyRef.onDestroy(() => this.teardown());
    }

    /**
     * (Re)starts the legend-transition scheduler against the current
     * view-model. The scheduler consumes the pre-filter `legendTransitions`
     * slice and dispatches a partial `setOption` payload at each crossing —
     * only the legend ghost series and the `legend` component option are
     * touched; bars stay mounted and their imperative running fills are not
     * disturbed.
     *
     * Pre-filter is intentional: the legend reflects the whole-instance
     * population (see `legend-counts.ts`), so filtering applied to the
     * rendered bars must not silence transitions for hidden bars.
     */
    private armLegendScheduler(viewModel: ViewModel): void {
        this.legendScheduler.bind(
            viewModel.legend,
            viewModel.legendTransitions,
            (legend) => this.dispatchLegendUpdate(legend),
        );
    }

    /**
     * Dispatches a partial `setOption` payload that refreshes only the
     * legend ghost series and the legend component's `data` array. The
     * call deliberately omits `replaceMerge: ['series']` so ECharts'
     * default id-merge keeps every non-mentioned series mounted untouched;
     * the imperative running-bar fills live outside `setOption` entirely
     * and are likewise undisturbed.
     *
     * Drag-queue gating: if the user is mid-gesture the latest legend
     * snapshot is stashed on `pendingLegend` and flushed on drag release.
     * Stashing the **latest** value (overwriting any earlier pending
     * snapshot) is correct — the scheduler emits cumulative state, so
     * the freshest snapshot supersedes all prior ones.
     *
     * @param legend - Refreshed legend slice produced by the scheduler.
     */
    private dispatchLegendUpdate(legend: readonly LegendItemVm[]): void {
        if (!this.chart) {
            return;
        }
        if (this.dragging) {
            this.pendingLegend = legend;
            return;
        }
        const option = buildLegendPartialOption(legend);
        this.chart.setOption(option);
    }

    resetZoom(): void {
        this.chart?.dispatchAction({ type: 'dataZoom', dataZoomId: HORIZONTAL_SLIDER_DATAZOOM_ID, start: 0, end: 100 });
    }

    /**
     * Composes the full ECharts option payload for one view-model
     * emission by delegating to {@link composeLiveOption}.
     *
     * @param viewModel - Current view-model emission.
     * @returns The composed option ready for `setOption`.
     */
    private composeOption(viewModel: ViewModel): EChartsOption {
        return this.composeLiveOption(viewModel);
    }

    /**
     * Builds the option by running every relevant builder and merging
     * their fragments. Single-pass: reads only from the supplied
     * view-model and the host dimensions, performs no subscriptions, and
     * returns the merged option payload.
     *
     * @param viewModel - Live view-model.
     * @returns The merged option payload.
     */
    private composeLiveOption(viewModel: ViewModel): EChartsOption {
        const hostWidth = this.outerHost?.clientWidth ?? 0;
        const hostHeight = this.outerHost?.clientHeight ?? 0;
        const traineeCount = viewModel.trainees.length;
        const visibleRowCount = this.computeVisibleRowCount(traineeCount);
        const legendVm: LegendVm = {
            items: viewModel.legend,
            alignRight: hostWidth < LEGEND_ALIGN_RIGHT_BELOW_PX,
        };

        const fragments: OptionFragment[] = [
            buildAxisFragment(viewModel.axis, traineeCount, viewModel.trainees),
            buildGridFragment({
                visibleRowCount,
                hostWidth,
                hostHeight,
            }),
            buildDataZoomFragment({
                totalRowCount: traineeCount,
                visibleRowCount,
                preservedZoom: this.currentHorizontalZoom,
                preservedScrollStartIndex: this.currentVerticalScroll,
                spansMidnight: viewModel.axis.spansMidnight,
            }),
            buildBarsFragment(viewModel.bars, viewModel.axis),
            buildEstimateOverlayFragment(viewModel.bars, viewModel.axis),
            buildEventIconsFragment(viewModel.eventsByBar, viewModel.bars),
            buildRunCapsFragment(viewModel.bars, viewModel.eventsByBar),
            buildLegendFragment(legendVm),
            buildTooltipFragment(),
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
        this.updateCurrentTimeMarkerPosition(this.chart);
        this.updateRunningBarFills(this.chart);
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
                this.drainPendingLegend();
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
        this.updateCurrentTimeMarkerPosition(this.chart);
        this.updateRunningBarFills(this.chart);
    }

    /**
     * Applies the queued legend snapshot, if any, after a drag releases.
     * Runs after `drainPendingOption` so a full-dispatch payload (which
     * also carries a fresh legend slice via the view-model effect) lands
     * first; the legend partial then overlays the most recent scheduler
     * snapshot on top of it. Both calls obey the same id-merge guarantee:
     * the partial dispatch never touches the bars series.
     */
    private drainPendingLegend(): void {
        if (this.pendingLegend === null || !this.chart) {
            return;
        }
        const legend = this.pendingLegend;
        this.pendingLegend = null;
        this.chart.setOption(buildLegendPartialOption(legend));
    }

    /**
     * Subscribes to `'dataZoom'` events and routes each batch entry to the
     * correct state field based on its stable `dataZoomId`. Mixed-axis batch
     * events (e.g. simultaneous horizontal + vertical) are safe: each entry
     * is dispatched independently so horizontal events never corrupt vertical
     * state and vice-versa.
     *
     * Horizontal entries update `currentHorizontalZoom` and the
     * `isZoomedIn` signal. Vertical entries update `currentVerticalScroll`
     * using `startValue` (row-index anchoring as set by the builder).
     *
     * Calls `off` first to keep listeners deduped if `bind` is ever called
     * twice.
     *
     * @param chart - The bound ECharts instance.
     */
    private wireDataZoomListener(chart: ECharts): void {
        chart.off('dataZoom');
        chart.on('dataZoom', (event: unknown) => {
            const payload = event as DataZoomEventPayload;
            const entries: ReadonlyArray<DataZoomBatchEntry> = payload.batch ?? [payload];
            let sawVertical = false;
            for (const entry of entries) {
                const id = entry.dataZoomId;
                if (id === HORIZONTAL_SLIDER_DATAZOOM_ID || id === HORIZONTAL_INSIDE_DATAZOOM_ID) {
                    if (entry.start !== undefined && entry.end !== undefined) {
                        this.currentHorizontalZoom = {
                            startPct: entry.start,
                            endPct: entry.end,
                        };
                        this.internalIsZoomedIn.set(
                            entry.start !== 0 || entry.end !== 100,
                        );
                        this.updateCurrentTimeMarkerPosition(chart);
                        this.updateRunningBarFills(chart);
                    }
                } else if (
                    id === VERTICAL_SCROLLBAR_DATAZOOM_ID ||
                    id === VERTICAL_INSIDE_DATAZOOM_ID
                ) {
                    sawVertical = true;
                }
            }
            if (sawVertical) {
                // Wheel-pan and slider events carry percent-only fields; the
                // component option always holds the normalized startValue regardless
                // of which event shape triggered the change.
                const rawOption = chart.getOption();
                const dataZoomArray = rawOption['dataZoom'];
                if (Array.isArray(dataZoomArray)) {
                    const scrollbarState = (dataZoomArray as DataZoomComponentState[]).find(
                        (entry) => entry.id === VERTICAL_SCROLLBAR_DATAZOOM_ID,
                    );
                    if (scrollbarState !== undefined) {
                        const startValue = scrollbarState.startValue;
                        if (startValue !== undefined && Number.isFinite(startValue)) {
                            this.currentVerticalScroll = startValue;
                        }
                    }
                }
            }
        });
    }

    /**
     * Subscribes to `'legendselectchanged'` events and reflects the resulting
     * selection state into the lag-state filter. Legend entries that are
     * deselected (i.e. `selected[label] === false`) are added to the exclusion
     * set and passed to `uiState.setLagFilter`. Calls `off` first to keep
     * listeners deduped if `bind` is ever called twice.
     *
     * Polarity: `lagFilter` membership means *excluded* (see `selectors/filtered.ts`),
     * so an unselected legend chip → the corresponding `LagState` enters the set.
     *
     * @param chart - The bound ECharts instance.
     */
    private wireLegendListener(chart: ECharts): void {
        chart.off('legendselectchanged');
        chart.on('legendselectchanged', (event: unknown) => {
            const payload = event as LegendSelectChangedPayload;
            const excluded = new Set<LagState>();
            for (const [chipName, isSelected] of Object.entries(payload.selected)) {
                if (!isSelected) {
                    const lagState = LABEL_TO_LAG_STATE.get(chipName);
                    if (lagState !== undefined) {
                        excluded.add(lagState);
                    }
                }
            }
            this.uiState.setLagFilter(excluded);
        });
    }

    /**
     * Subscribes to `'click'` events on the Y-axis labels and toggles the
     * favourite state for the clicked trainee. Filters on
     * `componentType === 'yAxis'` and `targetType === 'axisLabel'` so
     * clicks elsewhere on the chart are ignored.
     *
     * The Y-axis `data` array is `['0', '1', ...]` (see `axis.builder.ts`),
     * so `event.value` is a string. It is parsed to obtain the row index,
     * which is used to resolve the corresponding `TraineeVm` from the live
     * view-model. Clicks before the view-model resolves are no-ops.
     *
     * Calls `off` first to keep listeners deduped if `bind` is ever called twice.
     *
     * @param chart - The bound ECharts instance.
     */
    private wireYAxisLabelClickListener(chart: ECharts): void {
        chart.off('click');
        chart.on('click', (event: unknown) => {
            const payload = event as AxisLabelClickPayload;
            if (payload.componentType !== 'yAxis' || payload.targetType !== 'axisLabel') {
                return;
            }
            const vm = this.viewModel?.();
            if (vm == null) {
                return;
            }
            const rowIndex = parseInt(String(payload.value), 10);
            if (!Number.isFinite(rowIndex)) {
                return;
            }
            const trainee = vm.trainees[rowIndex];
            if (trainee === undefined) {
                return;
            }
            this.uiState.toggleFavorite(trainee.id);
        });
    }

    /**
     * Computes how many rows fit in the outer host's current height and
     * updates `internalVisibleRowCount` and `internalInnerHostHeightPx`.
     * Called on every outer-host resize and after the view-model changes
     * the row count.
     *
     * @param totalRowCount - Total number of trainees.
     * @returns The number of rows to display without scrolling.
     */
    private computeVisibleRowCount(totalRowCount: number): number {
        const outerHeight = this.outerHost?.clientHeight ?? 0;
        const availableRows = outerHeight > 0
            ? Math.max(1, Math.floor((outerHeight - CHART_TOP_RESERVE_PX - CHART_BOTTOM_RESERVE_PX) / ROW_HEIGHT_PX))
            : totalRowCount;
        const visibleRowCount = Math.min(totalRowCount, Math.max(1, availableRows));
        this.internalVisibleRowCount.set(visibleRowCount);
        this.internalInnerHostHeightPx.set(
            visibleRowCount * ROW_HEIGHT_PX + CHART_TOP_RESERVE_PX + CHART_BOTTOM_RESERVE_PX,
        );
        return visibleRowCount;
    }

    /**
     * Observes the outer host element's size to recompute `visibleRowCount`
     * when available height changes. Triggers re-dispatch via the effect
     * reading `internalVisibleRowCount`.
     *
     * @param outerHost - The outer flex-grown container element.
     */
    private wireOuterResizeObserver(outerHost: HTMLElement): void {
        const resizeObserver = new ResizeObserver(() => {
            const vm = this.viewModel?.();
            if (vm == null) {
                return;
            }
            this.internalHostWidth.set(outerHost.clientWidth);
            this.computeVisibleRowCount(vm.trainees.length);
        });
        resizeObserver.observe(outerHost);
        this.outerResizeObserver = resizeObserver;
    }

    /**
     * Observes the inner (ECharts mount) element's size and forwards resize
     * events to the chart instance so ECharts re-runs `renderItem` and
     * refreshes pixel anchors.
     *
     * @param innerHost - The ECharts container element.
     * @param chart - The bound ECharts instance.
     */
    private wireInnerResizeObserver(innerHost: HTMLElement, chart: ECharts): void {
        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
            this.updateCurrentTimeMarkerPosition(chart);
            this.updateRunningBarFills(chart);
        });
        resizeObserver.observe(innerHost);
        this.innerResizeObserver = resizeObserver;
    }

    /**
     * Starts the axis-padding watchdog. Runs outside Angular's change-
     * detection zone so the interval does not trigger CD on every tick.
     * When the remaining right-padding (axisEnd − now) drops below the
     * refresh threshold, the tick re-enters the zone and calls
     * `feed.refreshAxisNow()`, which advances the axis now-anchor signal
     * and causes the view-model computed to emit a fresh `axis.endMs`.
     */
    private startWatchdog(): void {
        this.ngZone.runOutsideAngular(() => {
            this.watchdogTimer = setInterval(() => {
                const vm = this.viewModel?.();
                if (vm == null) {
                    return;
                }
                const axisEndMs = vm.axis.endMs;
                const remaining = axisEndMs - Date.now();
                if (remaining < AXIS_REFRESH_THRESHOLD_MS) {
                    this.ngZone.run(() => {
                        this.feed.refreshAxisNow();
                    });
                }
            }, AXIS_WATCHDOG_INTERVAL_MS);
        });
    }

    /**
     * Creates the permanent current-time marker: a vertical zrender `Line`
     * and a `Text` clock label anchored at the line's top. Both elements are
     * added directly to the chart's zrender layer; they never go through
     * `setOption` and are never removed by `replaceMerge: ['series']`.
     *
     * The line color is `CURRENT_TIME_MARKER_LINE_COLOR` (#0b0b0b) — a
     * near-black value that reads on all series backgrounds. Canvas rendering
     * cannot consume CSS custom properties, so the value is a concrete hex
     * stored in `ui.config.ts`.
     *
     * The 4Hz interval runs outside Angular's change-detection zone so it
     * does not trigger CD on every tick.
     *
     * @param chart - The bound ECharts instance.
     */
    private startCurrentTimeMarker(chart: ECharts): void {
        const markerLine = new graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: {
                stroke: CURRENT_TIME_MARKER_LINE_COLOR,
                lineWidth: CURRENT_TIME_MARKER_LINE_WIDTH,
            },
            silent: true,
            z: 10,
            invisible: true,
        });
        const markerText = new graphic.Text({
            style: {
                text: '',
                x: 0,
                y: 0,
                fill: CURRENT_TIME_MARKER_LINE_COLOR,
                fontSize: 10,
                align: 'center',
                verticalAlign: 'bottom',
            },
            silent: true,
            z: 10,
            invisible: true,
        });
        chart.getZr().add(markerLine);
        chart.getZr().add(markerText);
        this.currentTimeMarkerLine = markerLine;
        this.currentTimeMarkerText = markerText;

        this.ngZone.runOutsideAngular(() => {
            this.currentTimeMarkerTimer = setInterval(() => {
                this.updateCurrentTimeMarkerPosition(chart);
                this.updateRunningBarFills(chart);
            }, 250);
        });
    }

    /**
     * Repositions the current-time marker line and clock label to the pixel
     * coordinate of `Date.now()` on the live xAxis transform.
     *
     * Hides both elements when the computed pixel falls outside the plot-area
     * horizontal bounds (`[GRID_LEFT_PX, chart.getWidth() - GRID_RIGHT_PX]`)
     * or when `convertToPixel` returns a non-finite value (chart not yet
     * rendered).
     *
     * @param chart - The bound ECharts instance.
     */
    private updateCurrentTimeMarkerPosition(chart: ECharts): void {
        if (this.currentTimeMarkerLine === null || this.currentTimeMarkerText === null) {
            return;
        }
        const nowMs = Date.now();
        const rawPixel = chart.convertToPixel({ xAxisIndex: 0 }, nowMs);
        const markerPixelX = Array.isArray(rawPixel) ? rawPixel[0] : rawPixel;
        if (typeof markerPixelX !== 'number' || !Number.isFinite(markerPixelX)) {
            return;
        }
        const gridLeft = GRID_LEFT_PX;
        const gridRight = chart.getWidth() - GRID_RIGHT_PX;
        if (markerPixelX < gridLeft || markerPixelX > gridRight) {
            this.currentTimeMarkerLine.attr({ invisible: true });
            this.currentTimeMarkerText.attr({ invisible: true });
            return;
        }
        const gridTop = CHART_TOP_RESERVE_PX;
        const gridBottom = chart.getHeight() - CHART_BOTTOM_RESERVE_PX;
        this.currentTimeMarkerLine.attr({
            shape: {
                x1: markerPixelX,
                y1: gridTop,
                x2: markerPixelX,
                y2: gridBottom,
            },
            invisible: false,
        });
        this.currentTimeMarkerText.setStyle({
            text: dateFnsFormat(nowMs, 'HH:mm:ss'),
            x: markerPixelX,
            y: gridTop,
        });
        this.currentTimeMarkerText.attr({ invisible: false });
    }

    /**
     * Repaints every imperative running-bar fill rect to reflect the
     * current wall-clock position and lag state. Mirrors the logic of
     * `updateCurrentTimeMarkerPosition` but operates on a keyed map of
     * `graphic.Rect` elements — one per running bar — rather than a single
     * line element.
     *
     * Rects are created on demand and reused across calls. Any rect whose
     * bar is no longer running is removed from the zrender layer and pruned
     * from the map at the end of each call so stale fills do not persist
     * after a bar completes.
     *
     * Each fill rect is added at `z: -1` so it paints beneath the series
     * pill and icon shapes rendered by `renderItem`.
     *
     * The fill is clipped to `[GRID_LEFT_PX, chart.getWidth() - GRID_RIGHT_PX]`
     * horizontally and to `[CHART_TOP_RESERVE_PX, chart.getHeight() -
     * CHART_BOTTOM_RESERVE_PX]` vertically — rows scrolled outside the plot
     * area by the vertical dataZoom are hidden.
     *
     * @param chart - The bound ECharts instance.
     */
    private updateRunningBarFills(chart: ECharts): void {
        const vm = this.viewModel?.();
        if (vm == null) {
            return;
        }
        const bars = vm.bars;
        const axisEndMs = vm.axis.endMs;
        const nowMs = Date.now();
        const runningBars = bars.filter((b) => b.isRunning);
        const activeKeys = new Set(runningBars.map((b) => b.key));

        for (const bar of runningBars) {
            const rawLeft = chart.convertToPixel({ xAxisIndex: 0 }, bar.startedAt);
            const rawRight = chart.convertToPixel({ xAxisIndex: 0 }, Math.min(nowMs, axisEndMs));
            const leftRaw = Array.isArray(rawLeft) ? rawLeft[0] : rawLeft;
            const rightRaw = Array.isArray(rawRight) ? rawRight[0] : rawRight;

            if (typeof leftRaw !== 'number' || !Number.isFinite(leftRaw) ||
                typeof rightRaw !== 'number' || !Number.isFinite(rightRaw)) {
                continue;
            }

            const rawCenterY = chart.convertToPixel({ yAxisIndex: 0 }, bar.rowIndex);
            const centerY = Array.isArray(rawCenterY) ? rawCenterY[1] : rawCenterY;
            if (typeof centerY !== 'number' || !Number.isFinite(centerY)) {
                continue;
            }

            const gridLeft = GRID_LEFT_PX;
            const gridRight = chart.getWidth() - GRID_RIGHT_PX;
            const leftX = Math.max(gridLeft, leftRaw);
            const rightX = Math.min(gridRight, rightRaw);

            let el = this.runningBarFills.get(bar.key);
            if (el === undefined) {
                el = new graphic.Rect({ silent: true, z: -1, invisible: true });
                chart.getZr().add(el);
                this.runningBarFills.set(bar.key, el);
            }

            if (rightX <= leftX) {
                el.attr({ invisible: true });
                continue;
            }

            const state = resolveRunningBarEffectiveState(bar, nowMs);
            const color = LAG_STATE_COLORS[state];
            const height = resolveBarHeightPx(true, state);
            const y = centerY - height / 2;

            const gridTop = CHART_TOP_RESERVE_PX;
            const gridBottom = chart.getHeight() - CHART_BOTTOM_RESERVE_PX;
            if (y + height <= gridTop || y >= gridBottom) {
                el.attr({ invisible: true });
                continue;
            }

            el.attr({ shape: { x: leftX, y, width: rightX - leftX, height }, invisible: false });
            el.setStyle({ fill: color });
        }

        for (const [key, el] of this.runningBarFills) {
            if (!activeKeys.has(key)) {
                chart.getZr().remove(el);
                this.runningBarFills.delete(key);
            }
        }
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
        if (this.watchdogTimer !== null) {
            clearInterval(this.watchdogTimer);
            this.watchdogTimer = null;
        }
        if (this.currentTimeMarkerTimer !== null) {
            clearInterval(this.currentTimeMarkerTimer);
            this.currentTimeMarkerTimer = null;
        }
        if (this.chart !== null) {
            if (this.currentTimeMarkerLine !== null) {
                this.chart.getZr().remove(this.currentTimeMarkerLine);
                this.currentTimeMarkerLine = null;
            }
            if (this.currentTimeMarkerText !== null) {
                this.chart.getZr().remove(this.currentTimeMarkerText);
                this.currentTimeMarkerText = null;
            }
            for (const el of this.runningBarFills.values()) {
                this.chart.getZr().remove(el);
            }
            this.runningBarFills.clear();
        }
        this.outerResizeObserver?.disconnect();
        this.outerResizeObserver = null;
        this.innerResizeObserver?.disconnect();
        this.innerResizeObserver = null;
        this.chart?.dispose();
        this.chart = null;
        this.outerHost = null;
        this.pendingOption = null;
        this.pendingLegend = null;
        this.dragging = false;
        this.viewModel = null;
        this.currentHorizontalZoom = null;
        this.currentVerticalScroll = null;
        this.legendScheduler.cancel();
    }
}
