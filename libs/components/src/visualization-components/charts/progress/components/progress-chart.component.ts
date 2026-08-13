import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    NgZone,
    Signal
} from '@angular/core';
import { EChartsCoreOption, EChartsOption, LegendComponentOption, SeriesOption, SetOptionOpts } from 'echarts';
import { ECharts, graphic } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

import { ChartOptionApply, ChartPalette, ECHARTS_CORE_PROVIDER, EchartsChartBase } from '../../shared';
import { LAG_STATE_COLORS, LAG_STATE_LABELS } from '../config/lag.config';
import {
    AXIS_REFRESH_THRESHOLD_MS,
    AXIS_WATCHDOG_INTERVAL_MS,
    CHART_BOTTOM_RESERVE_PX,
    CHART_TOP_RESERVE_PX,
    CURRENT_TIME_MARKER_FONT_SIZE_PX,
    CURRENT_TIME_MARKER_LINE_WIDTH,
    CURRENT_TIME_MARKER_Z,
    DRAG_RELEASE_DELAY_MS,
    LEGEND_TEXT_HIDE_BELOW_PX,
    ROW_HEIGHT_PX,
    VISIBLE_ROW_COUNT
} from '../config/ui.config';
import { buildAxisFragment } from '../option-builders/axis.builder';
import { AxisTimeScale, createAxisTimeScale } from '../option-builders/axis-time-scale';
import {
    buildDataZoomFragment,
    HORIZONTAL_INSIDE_DATAZOOM_ID,
    HORIZONTAL_SLIDER_DATAZOOM_ID,
    VERTICAL_INSIDE_DATAZOOM_ID,
    VERTICAL_SCROLLBAR_DATAZOOM_ID
} from '../option-builders/data-zoom.builder';
import { buildGridFragment, GRID_LEFT_PX, GRID_RIGHT_PX } from '../option-builders/grid.builder';
import { buildBarsFragment, resolveRunningBarEffectiveState } from '../option-builders/bars/bars.builder';
import { resolveBarHeightPx } from '../option-builders/bars/bar-geometry';
import { buildEstimateOverlayFragment } from '../option-builders/bars/estimate-overlay.builder';
import { buildEventIconsFragment } from '../option-builders/event-icons.builder';
import { buildRunCapsFragment } from '../option-builders/run-caps.builder';
import { buildLegendFragment, buildLegendPartialOption, LegendVm } from '../option-builders/legend.builder';
import { buildEventLegendFragment, EventLegendVm } from '../option-builders/event-legend.builder';
import { buildTooltipFragment } from '../option-builders/tooltip.builder';
import { OptionFragment } from '../types/option-fragment.types';
import { EVENT_KIND_LABELS, EventKind } from '../types/event.types';
import { BarKey } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import { LegendItemVm, ViewModel } from '../types/view-model.types';
import { ChartRendererService } from '../services/chart-renderer.interface.service';
import { LegendTransitionSchedulerService } from '../services/legend-transition-scheduler.service';
import { ProgressFeedService } from '../services/progress-feed.interface.service';
import { ProgressUiStateService } from '../services/progress-ui-state.interface.service';

/**
 * Reverse map from human-readable legend label to its `LagState`, built once
 * at module load from `LAG_STATE_LABELS`.
 */
const LABEL_TO_LAG_STATE = new Map<string, LagState>(
    Object.entries(LAG_STATE_LABELS).map(([state, label]) => [label, state as LagState]),
);

/**
 * Reverse map from event-legend chip label to its `EventKind`, built once at
 * module load from `EVENT_KIND_LABELS`.
 */
const LABEL_TO_EVENT_KIND = new Map<string, EventKind>(
    Object.entries(EVENT_KIND_LABELS).map(([kind, label]) => [label, kind as EventKind]),
);

/**
 * Collects the excluded values from a legend `selected` map: every chip whose
 * label resolves through `labelMap` and is currently deselected. Chips from
 * other legends (absent from `labelMap`) are ignored.
 *
 * @param selected - The legend `selected` map keyed by chip label.
 * @param labelMap - Reverse map from chip label to the filter value.
 * @returns The set of deselected values.
 */
function collectExcluded<T>(
    selected: Readonly<Record<string, boolean>>,
    labelMap: ReadonlyMap<string, T>,
): Set<T> {
    const excluded = new Set<T>();
    for (const [chipName, isSelected] of Object.entries(selected)) {
        if (!isSelected) {
            const value = labelMap.get(chipName);
            if (value !== undefined) excluded.add(value);
        }
    }
    return excluded;
}

/** Cadence of the imperative overlay reposition timer, in milliseconds. */
const OVERLAY_TICK_MS = 250;

/** One entry of the `batch` array ECharts emits on `'dataZoom'`, keyed by component id. */
interface DataZoomBatchEntry {
    readonly dataZoomId?: string;
    readonly start?: number;
    readonly end?: number;
}

/** One dataZoom component as returned by `chart.getOption()`; uses `id`, not `dataZoomId`. */
interface DataZoomComponentState {
    readonly id?: string;
    readonly startValue?: number;
}

/**
 * Payload echarts dispatches on `'dataZoom'`. Modelled locally because the
 * upstream typings expose this only via a loose `any`-keyed dictionary. ECharts
 * always emits a `batch` array even for a single component; the top-level
 * `start`/`end` are present only for a non-shared-axis slider.
 */
interface DataZoomEventPayload {
    readonly batch?: ReadonlyArray<DataZoomBatchEntry>;
    readonly dataZoomId?: string;
    readonly start?: number;
    readonly end?: number;
}

/** Payload echarts dispatches on `'legendselectchanged'`. */
interface LegendSelectChangedPayload {
    readonly name: string;
    readonly selected: Readonly<Record<string, boolean>>;
}

/**
 * Payload echarts dispatches on `'click'` for axis labels. `value` is the
 * category string when `yAxis.type` is `'category'`.
 */
interface AxisLabelClickPayload {
    readonly componentType: string;
    readonly targetType: string;
    readonly value: string | number;
    readonly dataIndex: number;
}

/**
 * Progress chart for one training instance: per-trainee bars on a live time
 * axis, growing running-bar fills, a ticking current-time marker, event
 * roundels, run caps, a lag-state legend, and horizontal zoom plus vertical
 * row scroll.
 *
 * Mounts ECharts declaratively through ngx-echarts' `[options]` binding. The
 * declarative option ({@link chartOptions}) is composed from the feed's
 * view-model, the base palette and width signals, and the preserved zoom/scroll
 * captured on `dataZoom` events. The behaviours that need the live coordinate
 * transform — the running-bar fills and the current-time marker — are imperative
 * zrender overlays repositioned on a {@link OVERLAY_TICK_MS} timer and after
 * every option re-application; they live on the zrender layer and survive the
 * full-replace that `[options]` performs.
 */
@Component({
    selector: 'crczp-progress-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './progress-chart.component.html',
    styleUrl: './progress-chart.component.scss',
})
export class ProgressChartComponent extends EchartsChartBase {
    private readonly ngZone = inject(NgZone);
    private readonly feed = inject(ProgressFeedService);
    private readonly uiState = inject(ProgressUiStateService);
    private readonly legendScheduler = inject(LegendTransitionSchedulerService);
    private readonly sharedState = inject(ChartRendererService);

    /** Whether at least one option has been applied, gating `convertToPixel` use. */
    private chartHasOption = false;

    /** Latest legend snapshot stashed while a drag gesture is in flight. */
    private pendingLegend: readonly LegendItemVm[] | null = null;

    /** True while a user drag is in flight, suppressing declarative option re-application. */
    private dragging = false;

    /** Pending drag-release timer differentiating a real drag-end from a click. */
    private dragReleaseTimer: ReturnType<typeof setTimeout> | null = null;

    /** Whether a declarative option was withheld during the active drag and must be re-applied on release. */
    private optionWithheldDuringDrag = false;

    /** Captured horizontal zoom window, re-injected into {@link chartOptions} so it survives rebuilds. */
    private currentHorizontalZoom: { startPct: number; endPct: number } | null = null;

    /** Captured vertical scroll row-anchor, re-injected into {@link chartOptions} so it survives rebuilds. */
    private currentVerticalScroll: number | null = null;

    private currentTimeMarkerLine: InstanceType<typeof graphic.Line> | null = null;
    private currentTimeMarkerText: InstanceType<typeof graphic.Text> | null = null;
    private overlayTimer: ReturnType<typeof setInterval> | null = null;
    private watchdogTimer: ReturnType<typeof setInterval> | null = null;

    private readonly runningBarFills = new Map<BarKey, InstanceType<typeof graphic.Rect>>();

    /**
     * Declarative ECharts option for the `[options]` binding. Recomposes from
     * the live view-model, the resolved palette and host width, and the
     * preserved zoom/scroll whenever any of those change. ngx-echarts applies
     * this with `notMerge`, so every series and dataZoom is rebuilt wholesale;
     * stable ids on each keep the chart visually stable across rebuilds.
     */
    protected readonly chartOptions: Signal<EChartsOption> = computed<EChartsOption>(() => {
        const viewModel = this.feed.viewModel();
        const timeScale = this.timeScale();
        if (viewModel === null || timeScale === null) return {};
        return this.composeLiveOption(viewModel, this.palette(), this.chartWidth(), timeScale);
    });

    /**
     * Active render-time axis time scale, recomposed from the live view-model
     * and the selected axis mode. The single seam that maps absolute epoch-ms
     * onto the X-axis space; the declarative builders and the imperative overlays
     * both resolve coordinates through it so the painted geometry and the axis
     * stay in one space. `null` until the first view-model lands.
     */
    protected readonly timeScale: Signal<AxisTimeScale | null> = computed<AxisTimeScale | null>(() => {
        const viewModel = this.feed.viewModel();
        if (viewModel === null) return null;
        return createAxisTimeScale(this.uiState.axisMode(), viewModel.axis, viewModel.bars);
    });

    /**
     * Pixel height the inner ECharts host is sized to: the visible-row window
     * times the row height plus the top and bottom reserves. The outer wrapper
     * scrolls when the rows overflow this fixed height. Mirrored into the shared
     * holder so the shell can position the reset-zoom FAB row.
     */
    protected readonly innerHostHeightPx: Signal<number> = computed<number>(() => {
        const viewModel = this.feed.viewModel();
        const traineeCount = viewModel?.trainees.length ?? 0;
        const visibleRowCount = Math.max(1, Math.min(traineeCount, VISIBLE_ROW_COUNT));
        return visibleRowCount * ROW_HEIGHT_PX + CHART_TOP_RESERVE_PX + CHART_BOTTOM_RESERVE_PX;
    });

    constructor() {
        super();
        this.armLegendScheduler();
        effect(() => this.sharedState.setInnerHostHeightPx(this.innerHostHeightPx()));
        inject(DestroyRef).onDestroy(() => this.teardown());
    }

    /**
     * Ports the imperative subsystems onto the instance: the drag-suppression gate,
     * the dataZoom/legend/axis-label listeners, the current-time marker, the
     * running-bar fills, the reposition timer and the axis-refresh watchdog. Also
     * registers the zoom-reset action with the shared-state holder.
     *
     * @param instance - The ECharts instance being wired.
     */
    protected override wireChart(instance: ECharts): void {
        super.wireChart(instance);
        this.sharedState.registerResetZoom(() => this.resetZoom());

        this.wireDragGate(instance);
        this.wireDataZoomListener(instance);
        this.wireLegendListener(instance);
        this.wireYAxisLabelClickListener(instance);
        this.startCurrentTimeMarker(instance);
        this.startOverlayTimer(instance);
        this.startWatchdog();
    }

    resetZoom(): void {
        this.liveChart()?.dispatchAction({
            type: 'dataZoom',
            dataZoomId: HORIZONTAL_SLIDER_DATAZOOM_ID,
            start: 0,
            end: 100,
        });
    }

    /**
     * Runs every option-builder against the view-model and merges the fragments
     * into a single option payload. Single-pass: reads only the view-model, the
     * palette, and the host width, and re-injects the preserved zoom/scroll.
     *
     * @param viewModel - Live view-model emission.
     * @param palette   - Resolved theme palette for canvas colours.
     * @param hostWidth - Live host width, threaded to the grid builder.
     * @param timeScale - Active axis time scale threaded into every coordinate-
     *                     bearing builder.
     * @returns The merged option payload for the `[options]` binding.
     */
    private composeLiveOption(
        viewModel: ViewModel,
        palette: ChartPalette,
        hostWidth: number,
        timeScale: AxisTimeScale,
    ): EChartsOption {
        const traineeCount = viewModel.trainees.length;
        const visibleRowCount = Math.max(1, Math.min(traineeCount, VISIBLE_ROW_COUNT));
        const hideLabels = hostWidth < LEGEND_TEXT_HIDE_BELOW_PX;
        const legendVm: LegendVm = {
            items: viewModel.legend,
            excludedStates: this.uiState.lagFilter(),
            hideLabels,
        };
        const eventLegendVm: EventLegendVm = {
            excludedKinds: this.uiState.eventTypeFilter(),
            hideLabels,
        };

        const fragments: OptionFragment[] = [
            buildAxisFragment(traineeCount, viewModel.trainees, palette, timeScale),
            buildGridFragment({ visibleRowCount, hostWidth }),
            buildDataZoomFragment({
                totalRowCount: traineeCount,
                visibleRowCount,
                preservedZoom: this.currentHorizontalZoom,
                preservedScrollStartIndex: this.currentVerticalScroll,
                timeScale,
                colors: palette,
            }),
            buildBarsFragment(viewModel.bars, viewModel.axis, palette, timeScale),
            buildEstimateOverlayFragment(viewModel.bars, viewModel.axis, timeScale),
            buildEventIconsFragment(viewModel.eventsByBar, viewModel.bars, timeScale, eventLegendVm.excludedKinds),
            buildRunCapsFragment(viewModel.bars, viewModel.eventsByBar, timeScale),
            buildLegendFragment(legendVm),
            buildEventLegendFragment(eventLegendVm),
            buildTooltipFragment(palette),
        ];

        return this.mergeFragments(fragments);
    }

    /**
     * Merges option fragments into one payload. The `series` and `legend` keys
     * are special-cased: every fragment's entries for them are concatenated into
     * an array (the chart carries multiple series and two legend components). All
     * other top-level keys are written once — last writer wins, but no two
     * builders target the same non-accumulated key.
     *
     * @param fragments - Fragments produced by the option-builders.
     * @returns The merged option.
     */
    private mergeFragments(fragments: readonly OptionFragment[]): EChartsOption {
        const merged: EChartsOption = {};
        const seriesAccumulator: SeriesOption[] = [];
        const legendAccumulator: LegendComponentOption[] = [];

        for (const fragment of fragments) {
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
                if (key === 'legend') {
                    const fragmentLegend = fragment.legend;
                    if (Array.isArray(fragmentLegend)) {
                        legendAccumulator.push(...fragmentLegend);
                    } else if (fragmentLegend !== undefined) {
                        legendAccumulator.push(fragmentLegend as LegendComponentOption);
                    }
                    continue;
                }
                Reflect.set(merged, key, Reflect.get(fragment, key));
            }
        }

        merged.series = seriesAccumulator;
        merged.legend = legendAccumulator;
        return merged;
    }

    /**
     * Drives the legend-transition scheduler from the live view-model. Each
     * threshold crossing dispatches a partial `setOption` (legend ghost series +
     * legend component only) that leaves the bars and the imperative overlays
     * untouched. Pre-filter transitions are used so hidden bars still emit
     * crossings (the legend reflects the whole-instance population).
     */
    private armLegendScheduler(): void {
        effect(() => {
            const viewModel = this.feed.viewModel();
            if (viewModel === null) return;
            this.legendScheduler.bind(
                viewModel.legend,
                viewModel.legendTransitions,
                (legend) => this.dispatchLegendUpdate(legend),
            );
        });
    }

    /**
     * Dispatches a partial `setOption` that refreshes only the legend ghost
     * series and the legend component's `data`. The call omits any merge flag so
     * ECharts' default id-merge keeps every non-mentioned series mounted; the
     * imperative overlays live outside `setOption` and are undisturbed. While a
     * drag is in flight the latest snapshot is stashed and flushed on release.
     *
     * @param legend - Refreshed legend slice produced by the scheduler.
     */
    private dispatchLegendUpdate(legend: readonly LegendItemVm[]): void {
        const instance = this.liveChart();
        if (instance === null) return;
        if (this.dragging) {
            this.pendingLegend = legend;
            return;
        }
        instance.setOption(buildLegendPartialOption(legend, this.legendLabelsHidden()));
    }

    /** Whether the legend chips render swatch/icon-only, per the live canvas width. */
    private legendLabelsHidden(): boolean {
        return this.chartWidth() < LEGEND_TEXT_HIDE_BELOW_PX;
    }

    /**
     * Suppresses declarative option re-application while the user drags a chart
     * control and re-applies the latest option on release. A `mousedown` raises
     * the gate; a `mouseup` lowers it after {@link DRAG_RELEASE_DELAY_MS} so a
     * click's back-to-back down/up does not count as a drag. On release any
     * option withheld during the gesture and any stashed legend snapshot are
     * applied so the chart catches up to the live state.
     *
     * @param instance - The captured ECharts instance.
     */
    private wireDragGate(instance: ECharts): void {
        const renderer = instance.getZr();
        renderer.on('mousedown', () => {
            this.dragging = true;
            if (this.dragReleaseTimer !== null) {
                clearTimeout(this.dragReleaseTimer);
                this.dragReleaseTimer = null;
            }
        });
        renderer.on('mouseup', () => {
            if (this.dragReleaseTimer !== null) clearTimeout(this.dragReleaseTimer);
            this.dragReleaseTimer = setTimeout(() => {
                this.dragging = false;
                this.dragReleaseTimer = null;
                if (this.optionWithheldDuringDrag) {
                    this.optionWithheldDuringDrag = false;
                    instance.setOption(this.chartOptions(), { notMerge: true });
                }
                this.drainPendingLegend();
            }, DRAG_RELEASE_DELAY_MS);
        });
    }

    /**
     * Applies the legend snapshot stashed during a drag, if any. Runs after a
     * withheld full option lands so the partial overlays the freshest scheduler
     * snapshot on top of it; the partial never touches the bars series.
     */
    private drainPendingLegend(): void {
        const instance = this.liveChart();
        if (this.pendingLegend === null || instance === null) return;
        const legend = this.pendingLegend;
        this.pendingLegend = null;
        instance.setOption(buildLegendPartialOption(legend, this.legendLabelsHidden()));
    }

    /**
     * Repositions the imperative overlays against the freshly-applied coordinate
     * system after each option application, and withholds a full declarative
     * re-application arriving mid-drag until the gesture releases. ngx-echarts
     * re-applies the full option on every data refresh, so this is the single seam
     * through which the overlays re-assert.
     *
     * @param instance     - The ECharts instance the option is applied to.
     * @param applyToChart - The unwrapped `setOption` that performs the application.
     * @param option       - The option payload to apply.
     * @param notMerge     - ECharts' `notMerge` flag, in either accepted form.
     */
    protected override applyChartOption(
        instance: ECharts,
        applyToChart: ChartOptionApply,
        option: EChartsCoreOption,
        notMerge?: boolean | SetOptionOpts,
    ): void {
        if (this.isFullReplace(notMerge) && this.dragging) {
            this.optionWithheldDuringDrag = true;
            return;
        }
        super.applyChartOption(instance, applyToChart, option, notMerge);
        this.chartHasOption = true;
        this.updateCurrentTimeMarkerPosition(instance);
        this.updateRunningBarFills(instance);
    }

    /**
     * Determines whether a `setOption` call is a full declarative replacement —
     * the wholesale option ngx-echarts applies on every `[options]` change.
     * ngx-echarts passes the `notMerge` flag as the boolean `true`; the
     * component's own drain call passes it as `{ notMerge: true }`. The legend
     * partial passes no flag and is therefore not a full replace.
     *
     * @param notMergeArg - The second `setOption` argument (`notMerge`).
     * @returns True when the call replaces the whole option.
     */
    private isFullReplace(notMergeArg: boolean | SetOptionOpts | undefined): boolean {
        if (notMergeArg === true) return true;
        return typeof notMergeArg === 'object' && notMergeArg !== null && notMergeArg.notMerge === true;
    }

    /**
     * Routes each `'dataZoom'` batch entry to the correct preserved-state field
     * by its stable id. Horizontal entries update {@link currentHorizontalZoom}
     * and the shared `isZoomedIn` signal and reposition the overlays; vertical
     * entries update {@link currentVerticalScroll} from the component option.
     *
     * @param instance - The captured ECharts instance.
     */
    private wireDataZoomListener(instance: ECharts): void {
        instance.off('dataZoom');
        instance.on('dataZoom', (event: unknown) => {
            const payload = event as DataZoomEventPayload;
            const entries: ReadonlyArray<DataZoomBatchEntry> = payload.batch ?? [payload];
            let sawVertical = false;
            for (const entry of entries) {
                const id = entry.dataZoomId;
                if (id === HORIZONTAL_SLIDER_DATAZOOM_ID || id === HORIZONTAL_INSIDE_DATAZOOM_ID) {
                    if (entry.start !== undefined && entry.end !== undefined) {
                        this.currentHorizontalZoom = { startPct: entry.start, endPct: entry.end };
                        this.sharedState.setZoomedIn(entry.start !== 0 || entry.end !== 100);
                        this.updateCurrentTimeMarkerPosition(instance);
                        this.updateRunningBarFills(instance);
                    }
                } else if (id === VERTICAL_SCROLLBAR_DATAZOOM_ID || id === VERTICAL_INSIDE_DATAZOOM_ID) {
                    sawVertical = true;
                }
            }
            if (sawVertical) {
                const rawOption = instance.getOption();
                const dataZoomArray = rawOption['dataZoom'];
                if (Array.isArray(dataZoomArray)) {
                    const scrollbarState = (dataZoomArray as DataZoomComponentState[]).find(
                        (componentState) => componentState.id === VERTICAL_SCROLLBAR_DATAZOOM_ID,
                    );
                    const startValue = scrollbarState?.startValue;
                    if (startValue !== undefined && Number.isFinite(startValue)) {
                        this.currentVerticalScroll = startValue;
                    }
                }
            }
        });
    }

    /**
     * Reflects legend selection into the matching filter, routing by the toggled
     * chip's name: lag chips update the lag-state filter, event chips update the
     * event-type filter. A deselected chip adds its value to the exclusion set
     * (membership means *excluded*). The payload's `selected` map carries every
     * chip across both legends, so the relevant exclusion set is rebuilt from it
     * each time.
     *
     * @param instance - The captured ECharts instance.
     */
    private wireLegendListener(instance: ECharts): void {
        instance.off('legendselectchanged');
        instance.on('legendselectchanged', (event: unknown) => {
            const payload = event as LegendSelectChangedPayload;
            if (LABEL_TO_LAG_STATE.has(payload.name)) {
                this.uiState.setLagFilter(collectExcluded(payload.selected, LABEL_TO_LAG_STATE));
            } else if (LABEL_TO_EVENT_KIND.has(payload.name)) {
                this.uiState.setEventTypeFilter(collectExcluded(payload.selected, LABEL_TO_EVENT_KIND));
            }
        });
    }

    /**
     * Toggles a trainee's favourite state when its Y-axis label is clicked. The
     * Y-axis `data` is `['0', '1', ...]`, so `event.value` parses to the row
     * index that resolves the trainee from the live view-model.
     *
     * @param instance - The captured ECharts instance.
     */
    private wireYAxisLabelClickListener(instance: ECharts): void {
        instance.off('click');
        instance.on('click', (event: unknown) => {
            const payload = event as AxisLabelClickPayload;
            if (payload.componentType !== 'yAxis' || payload.targetType !== 'axisLabel') return;
            const vm = this.feed.viewModel();
            if (vm === null) return;
            const rowIndex = parseInt(String(payload.value), 10);
            if (!Number.isFinite(rowIndex)) return;
            const trainee = vm.trainees[rowIndex];
            if (trainee === undefined) return;
            this.uiState.toggleFavorite(trainee.id);
        });
    }

    /**
     * Creates the permanent current-time marker: a vertical zrender `Line` and a
     * `Text` clock label added straight to the zrender layer, so they survive
     * the full-replace `[options]` performs and are never part of the option
     * model. Both paint in the resolved text colour.
     *
     * Any marker pair from an earlier instance is released first, so the nodes never
     * accumulate on a canvas.
     *
     * @param instance - The captured ECharts instance.
     */
    private startCurrentTimeMarker(instance: ECharts): void {
        this.releaseOverlayNodes();
        const markerLine = new graphic.Line({
            shape: { x1: 0, y1: 0, x2: 0, y2: 0 },
            style: { stroke: this.palette().text, lineWidth: CURRENT_TIME_MARKER_LINE_WIDTH },
            silent: true,
            z: CURRENT_TIME_MARKER_Z,
            invisible: true,
        });
        const markerText = new graphic.Text({
            style: {
                text: '',
                x: 0,
                y: 0,
                fill: this.palette().text,
                fontSize: CURRENT_TIME_MARKER_FONT_SIZE_PX,
                align: 'center',
                verticalAlign: 'bottom',
            },
            silent: true,
            z: CURRENT_TIME_MARKER_Z,
            invisible: true,
        });
        instance.getZr().add(markerLine);
        instance.getZr().add(markerText);
        this.currentTimeMarkerLine = markerLine;
        this.currentTimeMarkerText = markerText;
    }

    /**
     * Starts the {@link OVERLAY_TICK_MS} timer that repositions the current-time
     * marker and the running-bar fills against the live axis transform. Runs
     * outside Angular so the tick does not trigger change detection. Replaces any
     * timer already running, and stops itself once the instance it repositions
     * against is disposed — every call on a disposed instance throws.
     *
     * @param instance - The captured ECharts instance.
     */
    private startOverlayTimer(instance: ECharts): void {
        this.stopOverlayTimer();
        this.ngZone.runOutsideAngular(() => {
            this.overlayTimer = setInterval(() => {
                if (instance.isDisposed()) {
                    this.stopOverlayTimer();
                    return;
                }
                this.updateCurrentTimeMarkerPosition(instance);
                this.updateRunningBarFills(instance);
            }, OVERLAY_TICK_MS);
        });
    }

    /** Stops the overlay reposition timer, if one is running. */
    private stopOverlayTimer(): void {
        if (this.overlayTimer === null) return;
        clearInterval(this.overlayTimer);
        this.overlayTimer = null;
    }

    /**
     * Starts the axis-padding watchdog. Runs outside Angular; when the remaining
     * right-padding (axisEnd − now) drops below the refresh threshold it re-enters
     * the zone and calls `feed.refreshAxisNow()` to advance the axis end ahead of
     * the current time. Replaces any watchdog already running.
     */
    private startWatchdog(): void {
        this.stopWatchdog();
        this.ngZone.runOutsideAngular(() => {
            this.watchdogTimer = setInterval(() => {
                const vm = this.feed.viewModel();
                if (vm === null) return;
                const remaining = vm.axis.endMs - Date.now();
                if (remaining < AXIS_REFRESH_THRESHOLD_MS) {
                    this.ngZone.run(() => this.feed.refreshAxisNow());
                }
            }, AXIS_WATCHDOG_INTERVAL_MS);
        });
    }

    /** Stops the axis-padding watchdog, if one is running. */
    private stopWatchdog(): void {
        if (this.watchdogTimer === null) return;
        clearInterval(this.watchdogTimer);
        this.watchdogTimer = null;
    }

    /**
     * Repositions the current-time marker line and clock label to the pixel of
     * `Date.now()` on the live xAxis. No-ops before the first option lands. Hides
     * both when the active time scale has no meaningful now-marker (duration
     * mode), when the pixel falls outside the plot-area horizontal bounds, or
     * when it is non-finite.
     *
     * @param instance - The captured ECharts instance.
     */
    private updateCurrentTimeMarkerPosition(instance: ECharts): void {
        if (!this.chartHasOption || this.currentTimeMarkerLine === null || this.currentTimeMarkerText === null) {
            return;
        }
        const timeScale = this.timeScale();
        if (timeScale === null || !timeScale.showNowMarker) {
            this.setMarkerVisible(false);
            return;
        }
        const nowMs = Date.now();
        const markerPixelX = timeScale.pixelX(instance, nowMs, 0);
        const gridRight = instance.getWidth() - GRID_RIGHT_PX;
        if (!Number.isFinite(markerPixelX) || markerPixelX < GRID_LEFT_PX || markerPixelX > gridRight) {
            this.setMarkerVisible(false);
            return;
        }
        const gridBottom = instance.getHeight() - CHART_BOTTOM_RESERVE_PX;
        this.currentTimeMarkerLine.attr({
            shape: { x1: markerPixelX, y1: CHART_TOP_RESERVE_PX, x2: markerPixelX, y2: gridBottom },
        });
        this.currentTimeMarkerText.setStyle({
            text: timeScale.formatAxisLabel(nowMs),
            x: markerPixelX,
            y: CHART_TOP_RESERVE_PX,
        });
        this.setMarkerVisible(true);
    }

    /**
     * Toggles the visibility of both current-time marker nodes together, keeping
     * the line and its clock label in lockstep.
     *
     * @param visible - Whether the marker line and label should be shown.
     */
    private setMarkerVisible(visible: boolean): void {
        this.currentTimeMarkerLine?.attr({ invisible: !visible });
        this.currentTimeMarkerText?.attr({ invisible: !visible });
    }

    /**
     * Repaints every imperative running-bar fill rect to the current wall-clock
     * position and lag state. Rects are created on demand at `z: -1` (beneath the
     * series pills), reused across calls, and clipped to the plot area; a rect
     * whose bar is no longer running is removed and pruned. No-ops before the
     * first option lands.
     *
     * @param instance - The captured ECharts instance.
     */
    private updateRunningBarFills(instance: ECharts): void {
        if (!this.chartHasOption) return;
        const vm = this.feed.viewModel();
        if (vm === null) return;
        const timeScale = this.timeScale();
        if (timeScale === null) return;
        const axisEndMs = vm.axis.endMs;
        const nowMs = Date.now();
        const runningBars = vm.bars.filter((bar) => bar.isRunning);
        const activeKeys = new Set(runningBars.map((bar) => bar.key));

        for (const bar of runningBars) {
            const leftRaw = timeScale.pixelX(instance, bar.startedAt, bar.rowIndex);
            const rightRaw = timeScale.pixelX(instance, Math.min(nowMs, axisEndMs), bar.rowIndex);
            if (!Number.isFinite(leftRaw) || !Number.isFinite(rightRaw)) {
                continue;
            }

            const rawCenterY = instance.convertToPixel({ yAxisIndex: 0 }, bar.rowIndex);
            const centerY = Array.isArray(rawCenterY) ? rawCenterY[1] : rawCenterY;
            if (typeof centerY !== 'number' || !Number.isFinite(centerY)) continue;

            const gridRight = instance.getWidth() - GRID_RIGHT_PX;
            const leftX = Math.max(GRID_LEFT_PX, leftRaw);
            const rightX = Math.min(gridRight, rightRaw);

            let el = this.runningBarFills.get(bar.key);
            if (el === undefined) {
                el = new graphic.Rect({ silent: true, z: -1, invisible: true });
                instance.getZr().add(el);
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

            const gridBottom = instance.getHeight() - CHART_BOTTOM_RESERVE_PX;
            if (y + height <= CHART_TOP_RESERVE_PX || y >= gridBottom) {
                el.attr({ invisible: true });
                continue;
            }

            el.attr({ shape: { x: leftX, y, width: rightX - leftX, height }, invisible: false });
            el.setStyle({ fill: color });
        }

        for (const [key, staleFill] of this.runningBarFills) {
            if (!activeKeys.has(key)) {
                instance.getZr().remove(staleFill);
                this.runningBarFills.delete(key);
            }
        }
    }

    /**
     * Releases the timers, the zrender overlays, and the scheduler. The ECharts
     * instance itself is disposed by ngx-echarts on its own destroy.
     */
    private teardown(): void {
        if (this.dragReleaseTimer !== null) {
            clearTimeout(this.dragReleaseTimer);
            this.dragReleaseTimer = null;
        }
        this.stopOverlayTimer();
        this.stopWatchdog();
        this.releaseOverlayNodes();
        this.legendScheduler.cancel();
    }

    /**
     * Drops the current-time marker pair and every running-bar fill, detaching them
     * from the zrender layer they were added to while that layer is still alive. A
     * disposed instance has already discarded its layer, so only the references are
     * cleared in that case.
     */
    private releaseOverlayNodes(): void {
        const renderer = this.liveChart()?.getZr() ?? null;
        if (renderer !== null) {
            if (this.currentTimeMarkerLine !== null) renderer.remove(this.currentTimeMarkerLine);
            if (this.currentTimeMarkerText !== null) renderer.remove(this.currentTimeMarkerText);
            for (const fill of this.runningBarFills.values()) renderer.remove(fill);
        }
        this.currentTimeMarkerLine = null;
        this.currentTimeMarkerText = null;
        this.runningBarFills.clear();
    }
}
