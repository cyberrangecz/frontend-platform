import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { format } from 'date-fns';
import {
    CustomSeriesOption,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomSeriesRenderItemReturn,
    EChartsOption,
    ScatterSeriesOption,
    XAXisComponentOption,
} from 'echarts';
import { ECharts } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

import { EntityResolverService, EntityType } from '@crczp/event-query-engine';
import { horizontalSliderStyle } from '@crczp/echarts-utils';
import {
    AbstractLevelTypeEnum,
    PlatformEventType
} from '@crczp/training-model';
import { Utils } from '@crczp/utils';

import {
    ChartPalette,
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    commandColorPair,
    CsvColumn,
    CsvExportable,
    createInstanceClock,
    DASHBOARD_CONFIG,
    ECHARTS_CORE_PROVIDER,
    EchartsChartBase,
    formatClock,
    formatZoomDuration,
    isRunSelected,
    LevelBasicView,
    renderRichTooltipHtml,
    resolveInstanceLevels,
    richTooltipDefaults,
    RichTooltipModel,
    RichTooltipRow,
} from '../shared';
import { createEventTimelineSource } from './event-timeline-source';
import { EventTimelineVm, TimelineCommand, TimelineIcon, TimelineMarker } from './event-timeline.model';
import {
    TIMELINE_MARKER_TYPES,
    TIMELINE_PADDING_MS,
    TIMELINE_TEXT_MAX,
    timelineEventIcon,
    timelineEventLabel,
} from './event-timeline.compute';

/** Y position (0..1) of the single events lane line. */
const EVENTS_LANE_Y = 0.72;
/** Y position (0..1) of the solid divider between the events and commands lanes. */
const LANE_DIVIDER_Y = 0.48;
/** Lowest Y of the jittered commands band. */
const COMMANDS_BAND_MIN = 0.08;
/** Vertical span the commands band occupies above its minimum. */
const COMMANDS_BAND_SPAN = 0.32;
/** Pixel font size of an event marker glyph. */
const EVENT_ICON_SIZE = 16;
/** Pixel diameter of a command circle. */
const COMMAND_SYMBOL_SIZE = 11;
/** Pixel gap from the chart's top edge to the grid, reserving room for the wall-clock axis. */
const GRID_TOP = 52;
/** Pixel gap held between the tooltip box and the snap line. */
const TOOLTIP_LINE_MARGIN = 8;
/** Fraction of the visible window panned per shift-wheel notch. */
const PAN_FRACTION = 0.12;
/** Window-shrink factor applied per zoom-in wheel notch. */
const ZOOM_IN_FACTOR = 0.92;
/** Smallest permitted zoom window, in milliseconds. */
const MIN_WINDOW_MS = 180_000;
/** Left edge of the domain: padding before the run start, mirroring the trailing padding. */
const TIMELINE_DOMAIN_MIN_MS = -TIMELINE_PADDING_MS;
/** Maximum cursor-to-event distance for snapping, in milliseconds. */
const SNAP_MAX_MS = 300_000;
/** Half-window around the snapped position whose items the tooltip lists, in milliseconds. */
const SNAP_NEARBY_MS = 15_000;

/** Minimal shape of a ZRender mouse-wheel event. */
interface ZRWheelEvent {
    readonly offsetX: number;
    readonly wheelDelta: number;
    readonly event: WheelEvent;
}

/** A persisted x-axis view window, expressed as absolute ms offsets from the run start. */
interface ZoomWindow {
    readonly startValue: number;
    readonly endValue: number;
}

/** Minimal shape of a ZRender pointer event carrying canvas-relative coordinates. */
interface ZRenderPointer {
    readonly offsetX: number;
    readonly offsetY: number;
}

/** One contiguous level band drawn behind both lanes. */
interface TimelineBand {
    readonly order: number;
    readonly title: string;
    readonly type: AbstractLevelTypeEnum | null;
    /** Band start, offset ms from run start. */
    readonly startMs: number;
    /** Band end, offset ms from run start. */
    readonly endMs: number;
    /** Position in the ordered band list, used for the zebra parity. */
    readonly index: number;
}

/** One wide, nullable CSV row for either a timeline event or a command. */
interface EventTimelineCsvRow {
    readonly traineeName: string;
    readonly handle: string;
    readonly offset: string;
    readonly timestamp: string;
    readonly kind: string;
    readonly type: string;
    readonly level: number | '';
    readonly levelTitle: string;
    readonly levelType: string;
    readonly answer: string;
    readonly submissionCount: number | '';
    readonly hintTitle: string;
    readonly penaltyPoints: number | '';
    readonly tool: string;
    readonly commandArguments: string;
    readonly commandType: string;
    readonly hostname: string;
    readonly username: string;
    readonly workingDirectory: string;
    readonly ipAddress: string;
}

/**
 * Formats an absolute timestamp as a wall-clock hour and minute.
 *
 * @param timestamp  Absolute millisecond timestamp.
 * @returns The `HH:mm` string.
 */
function formatWallClock(timestamp: number): string {
    return format(timestamp, 'HH:mm');
}

/**
 * Formats an absolute timestamp as a full month-day and time-of-day.
 *
 * @param timestamp  Absolute millisecond timestamp.
 * @returns The `MMM d, HH:mm:ss` string.
 */
function formatAbsolute(timestamp: number): string {
    return format(timestamp, 'MMM d, HH:mm:ss');
}

/**
 * Trims free text to the inline tooltip limit, appending an ellipsis when truncated.
 *
 * @param text  The text to trim.
 * @returns The trimmed text.
 */
function trimText(text: string): string {
    return text.length > TIMELINE_TEXT_MAX ? `${text.slice(0, TIMELINE_TEXT_MAX)}…` : text;
}

/**
 * Maps a level type to a capitalised label for tooltips and CSV.
 *
 * @param type  The level type, or null when unknown.
 * @returns The level-type label.
 */
function levelTypeLabel(type: AbstractLevelTypeEnum | null): string {
    switch (type) {
        case AbstractLevelTypeEnum.Training:
            return 'Training';
        case AbstractLevelTypeEnum.Access:
            return 'Access';
        case AbstractLevelTypeEnum.Assessment:
            return 'Assessment';
        case AbstractLevelTypeEnum.Info:
            return 'Info';
        default:
            return 'Level';
    }
}

/**
 * Chronological event-and-command timeline for one selected run: an events lane of icon
 * markers above a jittered swarm of console commands, banded by level, on a duration
 * x-axis with a wall-clock top axis.
 */
@Component({
    selector: 'crczp-event-timeline-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './event-timeline-chart.component.html',
    styleUrl: './event-timeline-chart.component.scss',
})
export class EventTimelineChartComponent
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<EventTimelineCsvRow>
{
    readonly instanceId: InputSignal<number> = input.required<number>();
    readonly runId: InputSignal<number | null> = input<number | null>(null);

    private readonly entityResolver = inject(EntityResolverService);

    private readonly source = createEventTimelineSource(this.instanceId, this.runId);

    private readonly resolvedLevels = toSignal(resolveInstanceLevels(this.instanceId, this.entityResolver), {
        initialValue: null,
    });

    private readonly now: Signal<number> = createInstanceClock(
        DASHBOARD_CONFIG.clockTickMs,
        () => this.resolvedLevels()?.instance.endTime,
    );

    /** Definition levels keyed by order, for band titles/types and level tooltips. */
    private readonly levelByOrder: Signal<ReadonlyMap<number, LevelBasicView>> = computed(() => {
        const resolved = this.resolvedLevels();
        const byOrder = new Map<number, LevelBasicView>();
        if (resolved) for (const level of resolved.levels) byOrder.set(level.order, level);
        return byOrder;
    });

    /** End of the x domain in ms (run end, or the live clock for a running run) plus padding. */
    private readonly domainMaxMs: Signal<number> = computed(() => {
        const vm = this.source.vm();
        if (!vm || vm.runStartTimestamp === null) return TIMELINE_PADDING_MS;
        const end = vm.runEndTimestamp ?? this.now();
        return Math.max(1, end - vm.runStartTimestamp) + TIMELINE_PADDING_MS;
    });

    /** Contiguous level bands for the selected run, in entry order. */
    private readonly bands: Signal<readonly TimelineBand[]> = computed(() => {
        const vm = this.source.vm();
        const levels = this.levelByOrder();
        if (!vm || vm.runStartTimestamp === null) return [];
        const entries = [...vm.startsByOrder.entries()]
            .map(([order, startMs]) => ({ order, startMs }))
            .sort((left, right) => left.startMs - right.startMs);
        const domainEnd = this.domainMaxMs() - TIMELINE_PADDING_MS;
        return entries.map((entry, index): TimelineBand => {
            const next = entries[index + 1];
            const level = levels.get(entry.order);
            return {
                order: entry.order,
                title: level?.title ?? `Level ${entry.order + 1}`,
                type: level?.type ?? null,
                startMs: entry.startMs,
                endMs: next ? next.startMs : domainEnd,
                index,
            };
        });
    });

    protected readonly status: Signal<ChartSourceStatus> = computed(() => {
        if (this.source.status() === 'error') return 'error';
        if (!isRunSelected(this.runId())) return 'loading';
        if (this.resolvedLevels() === null) return 'loading';
        const vm = this.source.vm();
        if (!vm || vm.runStartTimestamp === null) return 'loading';
        return vm.markers.length === 0 && vm.commands.length === 0 ? 'empty' : 'ready';
    });

    protected readonly chartOptions = computed<EChartsOption>(() => {
        const palette = this.palette();
        const vm = this.source.vm();
        const bands = this.bands();
        const markers = vm?.markers ?? [];
        const commands = vm?.commands ?? [];
        const runStartTimestamp = vm?.runStartTimestamp ?? 0;
        const domainMax = this.domainMaxMs();
        const zoomStartValue = this.zoomWindow?.startValue ?? TIMELINE_DOMAIN_MIN_MS;
        const zoomEndValue = this.zoomWindow?.endValue ?? domainMax;

        return {
            animation: false,
            grid: { top: GRID_TOP, right: 28, bottom: 62, left: 88, containLabel: false },
            graphic: [
                { id: 'lane-events', type: 'text', left: 14, top: '28%', style: { text: 'Events', fill: palette.mutedText, font: '12px sans-serif' } },
                { id: 'lane-commands', type: 'text', left: 14, top: '60%', style: { text: 'Commands', fill: palette.mutedText, font: '12px sans-serif' } },
                { id: 'snap-line', type: 'line', z: 5, silent: true, invisible: true, shape: { x1: 0, y1: 0, x2: 0, y2: 0 }, style: { stroke: palette.accent, lineWidth: 1, lineDash: [4, 4] } },
            ],
            tooltip: {
                ...richTooltipDefaults(palette),
                trigger: 'item',
                triggerOn: 'none',
                appendToBody: true,
                formatter: () => this.snapTooltipHtml,
                position: (point: number[], _params: unknown, _dom: unknown, _rect: unknown, size: { contentSize: number[]; viewSize: number[] }) => {
                    const lineX = point[0] ?? 0;
                    const viewWidth = size.viewSize[0] ?? 0;
                    const viewHeight = size.viewSize[1] ?? 0;
                    const tooltipHeight = size.contentSize[1] ?? 0;
                    const top = (viewHeight - tooltipHeight) / 2;
                    return lineX < viewWidth / 2
                        ? { top, left: lineX + TOOLTIP_LINE_MARGIN }
                        : { top, right: viewWidth - lineX + TOOLTIP_LINE_MARGIN };
                },
            },
            xAxis: this.buildXAxes(domainMax, runStartTimestamp, palette),
            yAxis: { type: 'value', min: 0, max: 1, show: false },
            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1],
                    filterMode: 'none',
                    zoomOnMouseWheel: false,
                    moveOnMouseWheel: false,
                    moveOnMouseMove: true,
                    startValue: zoomStartValue,
                    endValue: zoomEndValue,
                },
                {
                    ...horizontalSliderStyle({
                        track: palette.gridLine,
                        window: palette.accent,
                        handle: palette.accent,
                        label: palette.mutedText,
                    }),
                    type: 'slider',
                    xAxisIndex: [0, 1],
                    filterMode: 'none',
                    bottom: 8,
                    left: 120,
                    right: 80,
                    startValue: zoomStartValue,
                    endValue: zoomEndValue,
                    labelFormatter: (value: number) => formatZoomDuration(value),
                },
            ],
            series: [
                this.buildEventHitSeries(markers),
                this.buildCommandSeries(commands),
                this.buildBandSeries(bands, palette),
                this.buildLaneSeries(domainMax, palette),
                ...this.buildEventSeries(markers),
            ],
        };
    });

    /**
     * User's x-axis view window, held outside the reactive graph so capturing it on
     * `datazoom` never re-triggers a rebuild. Re-injected into every rebuilt option as
     * absolute ms offsets, so the view holds its place as the run's domain grows. Null
     * until the user first zooms or pans (the view then defaults to the full window).
     */
    private zoomWindow: ZoomWindow | null = null;

    /** Key (`e:<i>` event or `c:<i>` command) of the currently snapped item, or null when none. */
    private snapKey: string | null = null;

    /** Precomputed HTML returned verbatim by the tooltip formatter for the snapped position. */
    private snapTooltipHtml = '';

    /** Last canvas-relative pointer X, used to re-assert the snap after a data rebuild. */
    private lastPointerX: number | null = null;

    /** True while the component itself drives setOption, so the re-assert hook skips it. */
    private snapUpdating = false;

    /** Guards against stacking multiple queued re-asserts. */
    private reassertScheduled = false;

    /**
     * Captures the chart instance, drives wheel zoom (plain) and pan (shift)
     * mutually exclusively, and persists the user's view window across live rebuilds.
     *
     * @param instance  The initialised ECharts instance.
     */
    protected override onChartInit(instance: ECharts): void {
        super.onChartInit(instance);
        const renderer = instance.getZr();
        renderer.on('mousemove', (event: ZRenderPointer) => this.onPointerMove(instance, event));
        renderer.on('globalout', () => {
            this.lastPointerX = null;
            this.clearSnap(instance);
        });
        renderer.on('mousewheel', (event: ZRWheelEvent) => this.onWheel(instance, event));
        instance.on('datazoom', () => this.captureZoomWindow(instance));

        const applyOption = instance.setOption.bind(instance) as (...args: unknown[]) => unknown;
        (instance as unknown as { setOption: (...args: unknown[]) => unknown }).setOption = (...args: unknown[]): unknown => {
            const result = applyOption(...args);
            if (!this.snapUpdating && !this.reassertScheduled && this.lastPointerX !== null) {
                this.reassertScheduled = true;
                queueMicrotask(() => {
                    this.reassertScheduled = false;
                    this.reassertSnap(instance);
                });
            }
            return result;
        };
    }

    /**
     * Handles a wheel event: shift pans the window, a plain wheel zooms it around the
     * cursor. Native wheel zoom/move are disabled so the two never both fire.
     *
     * @param instance  The chart instance to drive.
     * @param event     The ZRender wheel event.
     */
    private onWheel(instance: ECharts, event: ZRWheelEvent): void {
        const delta = event.wheelDelta;
        if (delta === 0) return;
        event.event.preventDefault();

        const domainMin = TIMELINE_DOMAIN_MIN_MS;
        const domainMax = this.domainMaxMs();
        const window = this.zoomWindow ?? { startValue: domainMin, endValue: domainMax };
        const width = Math.max(1, window.endValue - window.startValue);

        if (!event.event.ctrlKey) {
            const shift = (delta > 0 ? -1 : 1) * width * PAN_FRACTION;
            let start = window.startValue + shift;
            let end = window.endValue + shift;
            if (start < domainMin) [start, end] = [domainMin, domainMin + width];
            if (end > domainMax) [start, end] = [domainMax - width, domainMax];
            this.applyZoom(instance, start, end);
            return;
        }

        const cursorValue = instance.convertFromPixel({ xAxisIndex: 0 }, event.offsetX);
        const anchor =
            typeof cursorValue === 'number'
                ? Math.min(domainMax, Math.max(domainMin, cursorValue))
                : window.startValue + width / 2;
        const maxWidth = domainMax - domainMin;
        const newWidth = Math.min(maxWidth, Math.max(MIN_WINDOW_MS, width * (delta > 0 ? ZOOM_IN_FACTOR : 1 / ZOOM_IN_FACTOR)));
        let start = anchor - ((anchor - window.startValue) / width) * newWidth;
        let end = start + newWidth;
        if (start < domainMin) [start, end] = [domainMin, domainMin + newWidth];
        if (end > domainMax) [start, end] = [domainMax - newWidth, domainMax];
        this.applyZoom(instance, start, end);
    }

    /**
     * Records and applies a view window to both dataZoom components.
     *
     * @param instance    The chart instance to drive.
     * @param startValue  Window start, ms offset from run start.
     * @param endValue    Window end, ms offset from run start.
     */
    private applyZoom(instance: ECharts, startValue: number, endValue: number): void {
        this.zoomWindow = { startValue, endValue };
        instance.dispatchAction({ type: 'dataZoom', startValue, endValue });
    }

    /**
     * Captures the live dataZoom window (slider drag, native drag-pan, or a dispatched
     * zoom) into {@link zoomWindow} so the next rebuild preserves it.
     *
     * @param instance  The chart instance to read the window from.
     */
    private captureZoomWindow(instance: ECharts): void {
        const option = instance.getOption() as {
            dataZoom?: ReadonlyArray<{ startValue?: number; endValue?: number }>;
        };
        const zoom = option.dataZoom?.[0];
        if (zoom && typeof zoom.startValue === 'number' && typeof zoom.endValue === 'number') {
            this.zoomWindow = { startValue: zoom.startValue, endValue: zoom.endValue };
        }
    }

    /**
     * Builds the bottom duration axis and the aligned top wall-clock axis, both over the
     * same `[0, domainMax]` offset domain.
     *
     * @param domainMax          The x-domain maximum in ms.
     * @param runStartTimestamp  Absolute run-start timestamp anchoring the wall-clock axis.
     * @param palette            The resolved chart palette.
     * @returns The two x-axis configurations.
     */
    private buildXAxes(
        domainMax: number,
        runStartTimestamp: number,
        palette: ChartPalette,
    ): XAXisComponentOption[] {
        const { mutedText, gridLine } = palette;
        return [
            {
                type: 'value',
                position: 'bottom',
                min: TIMELINE_DOMAIN_MIN_MS,
                max: domainMax,
                axisLabel: { color: mutedText, formatter: (value: number) => formatClock(value) },
                axisLine: { lineStyle: { color: gridLine } },
                axisTick: { show: false },
                splitLine: { show: true, lineStyle: { color: gridLine, type: 'dashed', opacity: 0.4 } },
            },
            {
                type: 'value',
                position: 'top',
                min: TIMELINE_DOMAIN_MIN_MS,
                max: domainMax,
                axisLabel: { color: mutedText, formatter: (value: number) => formatWallClock(runStartTimestamp + value) },
                axisLine: { lineStyle: { color: gridLine } },
                axisTick: { show: false },
                splitLine: { show: false },
            },
        ];
    }

    /**
     * Builds the level-band custom series: a left divider and a type-icon-plus-name label
     * per band. Purely visual; level context is carried in every marker tooltip.
     *
     * @param bands    The ordered level bands.
     * @param palette  The resolved chart palette.
     * @returns The band custom series.
     */
    private buildBandSeries(bands: readonly TimelineBand[], palette: ChartPalette): CustomSeriesOption {
        const { mutedText, gridLine } = palette;
        return {
            type: 'custom',
            name: 'Levels',
            z: 1,
            silent: true,
            clip: true,
            animation: false,
            data: bands.map((band) => ({ value: [band.startMs, band.endMs, band.index] })),
            renderItem: (_params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
                const index = api.value(2) as number;
                const band = bands[index];
                const bottomLeft = api.coord([api.value(0) as number, 0]);
                const topRight = api.coord([api.value(1) as number, 1]);
                const x0 = bottomLeft[0] ?? 0;
                const yTop = topRight[1] ?? 0;
                const width = (topRight[0] ?? 0) - x0;
                const height = (bottomLeft[1] ?? 0) - yTop;
                const glyph = band !== undefined && width > 28 && band.type ? Utils.LevelType.levelTypeToIcon(band.type) : '';
                const title = band !== undefined && width > 28 ? band.title : '';
                return {
                    type: 'group',
                    children: [
                        { type: 'line', shape: { x1: x0, y1: yTop, x2: x0, y2: yTop + height }, style: { stroke: gridLine, lineWidth: 1 } },
                        { type: 'text', style: { text: glyph, x: x0 + 6, y: yTop + 12, fontSize: 13, fontFamily: 'Material Icons', fill: mutedText, verticalAlign: 'middle' } },
                        { type: 'text', style: { text: title, x: x0 + (glyph ? 24 : 6), y: yTop + 12, fontSize: 12, fill: mutedText, verticalAlign: 'middle', overflow: 'truncate', width: Math.max(0, width - (glyph ? 30 : 12)) } },
                    ],
                };
            },
        };
    }

    /**
     * Builds the lane-decoration custom series: the events baseline the icons sit on, plus
     * the solid divider between the events and commands lanes. Drawn below the event
     * markers so it never crosses over them.
     *
     * @param domainMax  The x-domain maximum, in ms offset from run start.
     * @param palette    The resolved chart palette.
     * @returns The lane-decoration custom series.
     */
    private buildLaneSeries(domainMax: number, palette: ChartPalette): CustomSeriesOption {
        const { gridLine } = palette;
        return {
            type: 'custom',
            name: 'Lanes',
            z: 1,
            silent: true,
            clip: true,
            animation: false,
            data: [[0]],
            renderItem: (_params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI): CustomSeriesRenderItemReturn => {
                const baseLeft = api.coord([TIMELINE_DOMAIN_MIN_MS, EVENTS_LANE_Y]);
                const baseRight = api.coord([domainMax, EVENTS_LANE_Y]);
                const dividerLeft = api.coord([TIMELINE_DOMAIN_MIN_MS, LANE_DIVIDER_Y]);
                const dividerRight = api.coord([domainMax, LANE_DIVIDER_Y]);
                return {
                    type: 'group',
                    children: [
                        { type: 'line', shape: { x1: baseLeft[0] ?? 0, y1: baseLeft[1] ?? 0, x2: baseRight[0] ?? 0, y2: baseRight[1] ?? 0 }, style: { stroke: gridLine, lineWidth: 1 } },
                        { type: 'line', shape: { x1: dividerLeft[0] ?? 0, y1: dividerLeft[1] ?? 0, x2: dividerRight[0] ?? 0, y2: dividerRight[1] ?? 0 }, style: { stroke: gridLine, lineWidth: 1 } },
                    ],
                };
            },
        };
    }

    /**
     * Builds one icon-marker custom series per present event type, ordered so the more
     * informative events draw on top when clustered.
     *
     * @param markers  All timeline markers.
     * @returns One custom series per event type.
     */
    private buildEventSeries(markers: readonly TimelineMarker[]): CustomSeriesOption[] {
        const byType = new Map<PlatformEventType, TimelineMarker[]>();
        for (const marker of markers) {
            const list = byType.get(marker.type);
            if (list) list.push(marker);
            else byType.set(marker.type, [marker]);
        }
        return TIMELINE_MARKER_TYPES.filter((type) => byType.has(type)).map((type, drawOrder): CustomSeriesOption => {
            const list = byType.get(type) ?? [];
            const icon = timelineEventIcon(type);
            return {
                type: 'custom',
                name: timelineEventLabel(type),
                z: 3 + drawOrder,
                silent: true,
                clip: true,
                animation: false,
                data: list.map((marker) => ({ value: [marker.offsetMs, EVENTS_LANE_Y] })),
                renderItem: this.eventRenderItem(icon),
            };
        });
    }

    /**
     * Builds an invisible scatter over the event positions. Custom series are not reliably
     * picked up by axis-trigger tooltips, so this hit-layer lets the snapping axis pointer
     * resolve and show an event's tooltip. Its data order matches the markers array.
     *
     * @param markers  All timeline markers, in the order the tooltip indexes them.
     * @returns The invisible event hit scatter.
     */
    private buildEventHitSeries(markers: readonly TimelineMarker[]): ScatterSeriesOption {
        return {
            type: 'scatter',
            id: 'events',
            name: 'Events',
            z: 4,
            clip: true,
            symbol: 'rect',
            symbolSize: EVENT_ICON_SIZE + 8,
            itemStyle: { opacity: 0 },
            data: markers.map((marker) => ({ value: [marker.offsetMs, EVENTS_LANE_Y] })),
        };
    }

    /**
     * Builds the renderItem that draws one event marker as a badge circle with a centred
     * Material Icons glyph.
     *
     * @param icon  The marker's glyph and colours.
     * @returns The ECharts custom renderItem callback.
     */
    private eventRenderItem(
        icon: TimelineIcon,
    ): (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => CustomSeriesRenderItemReturn {
        return (_params, api) => {
            const point = api.coord([api.value(0) as number, api.value(1) as number]);
            const cx = point[0] ?? 0;
            const cy = point[1] ?? 0;
            return {
                type: 'group',
                children: [
                    { type: 'circle', shape: { cx, cy, r: EVENT_ICON_SIZE / 2 + 3 }, style: { fill: icon.bgColor, stroke: icon.color, lineWidth: 1 } },
                    {
                        type: 'text',
                        style: { text: icon.glyph, x: cx, y: cy, fontSize: EVENT_ICON_SIZE, fontFamily: 'Material Icons', fill: icon.color, align: 'center', verticalAlign: 'middle' },
                    },
                ],
            };
        };
    }

    /**
     * Builds the command scatter swarm: tool-coloured circles with auto-hiding tool-name
     * labels and leader lines.
     *
     * @param commands  The run's commands.
     * @returns The command scatter series.
     */
    private buildCommandSeries(commands: readonly TimelineCommand[]): ScatterSeriesOption {
        return {
            type: 'scatter',
            id: 'commands',
            name: 'Commands',
            z: 2,
            clip: true,
            animation: false,
            symbolSize: COMMAND_SYMBOL_SIZE,
            data: commands.map((command) => ({
                value: [command.offsetMs, COMMANDS_BAND_MIN + command.jitter * COMMANDS_BAND_SPAN],
                name: command.tool,
                itemStyle: { color: commandColorPair(command.tool).dark, opacity: 0.8 },
            })),
            label: { show: true, position: 'top', distance: 6, color: this.palette().mutedText, fontSize: 10, formatter: '{b}' },
            labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
            labelLine: { show: true, length2: 4, lineStyle: { color: this.palette().gridLine, width: 1 } },
        };
    }

    /**
     * On pointer move, snaps to the nearest event within the snap distance: shows the snap
     * line and a combined tooltip, or clears both when no event is close enough.
     *
     * @param instance  The chart instance to drive.
     * @param event     The ZRender pointer event.
     */
    private onPointerMove(instance: ECharts, event: ZRenderPointer): void {
        this.lastPointerX = event.offsetX;
        const vm = this.source.vm();
        if (!vm || vm.runStartTimestamp === null) {
            this.clearSnap(instance);
            return;
        }
        const cursorValue = instance.convertFromPixel({ xAxisIndex: 0 }, event.offsetX);
        if (typeof cursorValue !== 'number') {
            this.clearSnap(instance);
            return;
        }

        type SnapTarget = { key: string; seriesIndex: number; dataIndex: number; offsetMs: number; distance: number };
        const candidates: SnapTarget[] = [
            ...vm.markers.map((marker, index) => ({ key: `e:${index}`, seriesIndex: 0, dataIndex: index, offsetMs: marker.offsetMs, distance: Math.abs(marker.offsetMs - cursorValue) })),
            ...vm.commands.map((command, index) => ({ key: `c:${index}`, seriesIndex: 1, dataIndex: index, offsetMs: command.offsetMs, distance: Math.abs(command.offsetMs - cursorValue) })),
        ];
        let best: SnapTarget | null = null;
        for (const candidate of candidates) {
            if (best === null || candidate.distance < best.distance) best = candidate;
        }

        if (best === null || best.distance > SNAP_MAX_MS) {
            this.clearSnap(instance);
            return;
        }
        if (best.key === this.snapKey) return;
        this.snapKey = best.key;

        this.snapTooltipHtml = renderRichTooltipHtml(this.buildSnapModel(vm, best.offsetMs));
        const pixelX = instance.convertToPixel({ xAxisIndex: 0 }, best.offsetMs) as number;
        const topY = instance.convertToPixel({ yAxisIndex: 0 }, 1) as number;
        const bottomY = instance.convertToPixel({ yAxisIndex: 0 }, 0) as number;
        this.snapUpdating = true;
        instance.setOption({
            graphic: [{ id: 'snap-line', type: 'line', invisible: false, shape: { x1: pixelX, y1: topY, x2: pixelX, y2: bottomY } }],
        });
        this.snapUpdating = false;
        instance.dispatchAction({ type: 'showTip', seriesIndex: best.seriesIndex, dataIndex: best.dataIndex });
    }

    /**
     * Hides the snap line and tooltip when no event is in snapping range.
     *
     * @param instance  The chart instance to drive.
     */
    private clearSnap(instance: ECharts): void {
        if (this.snapKey === null) return;
        this.snapKey = null;
        this.snapTooltipHtml = '';
        instance.dispatchAction({ type: 'hideTip' });
        this.snapUpdating = true;
        instance.setOption({ graphic: [{ id: 'snap-line', type: 'line', invisible: true }] });
        this.snapUpdating = false;
    }

    /**
     * Re-applies the snap at the last pointer position after a chart rebuild, so the
     * tooltip and snap line survive a live data reload without needing a mouse move.
     *
     * @param instance  The chart instance to drive.
     */
    private reassertSnap(instance: ECharts): void {
        if (this.lastPointerX === null) return;
        this.snapKey = null;
        this.onPointerMove(instance, { offsetX: this.lastPointerX, offsetY: 0 });
    }

    /**
     * Builds the combined tooltip for a snapped position: the active level, followed by
     * every event and command within the nearby window, in chronological order.
     *
     * @param vm         The current view model.
     * @param snappedMs  The snapped position, ms offset from run start.
     * @returns The combined rich-tooltip model.
     */
    private buildSnapModel(vm: EventTimelineVm, snappedMs: number): RichTooltipModel {
        const runStart = vm.runStartTimestamp ?? 0;
        const level = this.bands().find((band) => snappedMs >= band.startMs && snappedMs < band.endMs) ?? null;

        const rows: RichTooltipRow[] = [];
        if (level) rows.push({ label: 'Type', value: levelTypeLabel(level.type) });
        rows.push({ label: 'At', value: `${formatClock(snappedMs)} · ${formatAbsolute(runStart + snappedMs)}` });

        const near = (offsetMs: number): boolean => Math.abs(offsetMs - snappedMs) <= SNAP_NEARBY_MS;
        const items = [
            ...vm.markers
                .filter((marker) => near(marker.offsetMs))
                .map((marker) => ({ offsetMs: marker.offsetMs, value: this.markerSummary(marker), color: timelineEventIcon(marker.type).color })),
            ...vm.commands
                .filter((command) => near(command.offsetMs))
                .map((command) => ({
                    offsetMs: command.offsetMs,
                    value: command.commandArguments ? `${command.tool} ${trimText(command.commandArguments)}` : command.tool,
                    color: commandColorPair(command.tool).dark,
                })),
        ].sort((left, right) => left.offsetMs - right.offsetMs);

        for (const item of items) {
            rows.push({ label: formatClock(item.offsetMs), value: item.value, valueColor: item.color });
        }
        return { title: level ? `Level ${level.order + 1} · ${level.title}` : 'Timeline', rows };
    }

    /**
     * Summarises an event marker for the combined tooltip: its label plus any answer or
     * hint detail, trimmed.
     *
     * @param marker  The event marker.
     * @returns The one-line summary.
     */
    private markerSummary(marker: TimelineMarker): string {
        const label = timelineEventLabel(marker.type);
        if (marker.answerText !== null) return `${label}: ${trimText(marker.answerText)}`;
        if (marker.hintTitle !== null) return `${label}: ${trimText(marker.hintTitle)}`;
        return label;
    }

    csvFilename(): string {
        const runId = this.runId();
        return runId ? `event-timeline-run-${runId}.csv` : 'event-timeline.csv';
    }

    csvColumns(): ReadonlyArray<CsvColumn<EventTimelineCsvRow>> {
        return [
            { header: 'Trainee', value: (row) => row.traineeName },
            { header: 'Handle', value: (row) => row.handle },
            { header: 'Offset', value: (row) => row.offset },
            { header: 'Timestamp', value: (row) => row.timestamp },
            { header: 'Kind', value: (row) => row.kind },
            { header: 'Type', value: (row) => row.type },
            { header: 'Level', value: (row) => row.level },
            { header: 'Level title', value: (row) => row.levelTitle },
            { header: 'Level type', value: (row) => row.levelType },
            { header: 'Answer', value: (row) => row.answer },
            { header: 'Submissions', value: (row) => row.submissionCount },
            { header: 'Hint', value: (row) => row.hintTitle },
            { header: 'Penalty', value: (row) => row.penaltyPoints },
            { header: 'Tool', value: (row) => row.tool },
            { header: 'Command arguments', value: (row) => row.commandArguments },
            { header: 'Command type', value: (row) => row.commandType },
            { header: 'Hostname', value: (row) => row.hostname },
            { header: 'Username', value: (row) => row.username },
            { header: 'Working directory', value: (row) => row.workingDirectory },
            { header: 'Source IP', value: (row) => row.ipAddress },
        ];
    }

    async csvRows(): Promise<ReadonlyArray<EventTimelineCsvRow>> {
        const vm = this.source.vm();
        if (!vm || vm.runStartTimestamp === null) return [];

        const userId = vm.userId;
        const user =
            userId === null
                ? undefined
                : (await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, [userId]))).get(userId);
        const traineeName = user?.name ?? user?.login ?? (userId === null ? '' : String(userId));
        const handle = user?.login ?? '';

        const eventEntries = vm.markers.map((marker) => ({
            timestamp: marker.timestamp,
            row: this.markerCsvRow(marker, traineeName, handle),
        }));
        const commandEntries = vm.commands.map((command) => ({
            timestamp: command.timestamp,
            row: this.commandCsvRow(command, traineeName, handle),
        }));
        return [...eventEntries, ...commandEntries]
            .sort((left, right) => left.timestamp - right.timestamp)
            .map((entry) => entry.row);
    }

    /**
     * Builds the CSV row for an event marker, leaving command columns blank.
     *
     * @param marker       The event marker.
     * @param traineeName  Resolved trainee name.
     * @param handle       Resolved trainee handle.
     * @returns The wide CSV row.
     */
    private markerCsvRow(marker: TimelineMarker, traineeName: string, handle: string): EventTimelineCsvRow {
        const level = this.levelByOrder().get(marker.levelOrder ?? -1);
        return {
            traineeName,
            handle,
            offset: formatClock(marker.offsetMs),
            timestamp: format(marker.timestamp, 'yyyy-MM-dd HH:mm:ss'),
            kind: 'Event',
            type: timelineEventLabel(marker.type),
            level: marker.levelOrder === null ? '' : marker.levelOrder + 1,
            levelTitle: level?.title ?? '',
            levelType: level ? levelTypeLabel(level.type) : '',
            answer: marker.answerText ?? '',
            submissionCount: marker.submissionCount ?? '',
            hintTitle: marker.hintTitle ?? '',
            penaltyPoints: marker.penaltyPoints ?? '',
            tool: '',
            commandArguments: '',
            commandType: '',
            hostname: '',
            username: '',
            workingDirectory: '',
            ipAddress: '',
        };
    }

    /**
     * Builds the CSV row for a command, leaving event columns blank.
     *
     * @param command      The command.
     * @param traineeName  Resolved trainee name.
     * @param handle       Resolved trainee handle.
     * @returns The wide CSV row.
     */
    private commandCsvRow(command: TimelineCommand, traineeName: string, handle: string): EventTimelineCsvRow {
        const level = this.levelByOrder().get(command.levelOrder ?? -1);
        return {
            traineeName,
            handle,
            offset: formatClock(command.offsetMs),
            timestamp: format(command.timestamp, 'yyyy-MM-dd HH:mm:ss'),
            kind: 'Command',
            type: 'Command',
            level: command.levelOrder === null ? '' : command.levelOrder + 1,
            levelTitle: level?.title ?? '',
            levelType: level ? levelTypeLabel(level.type) : '',
            answer: '',
            submissionCount: '',
            hintTitle: '',
            penaltyPoints: '',
            tool: command.tool,
            commandArguments: command.commandArguments,
            commandType: command.commandType,
            hostname: command.hostname ?? '',
            username: command.username ?? '',
            workingDirectory: command.workingDirectory ?? '',
            ipAddress: command.ipAddress ?? '',
        };
    }
}

