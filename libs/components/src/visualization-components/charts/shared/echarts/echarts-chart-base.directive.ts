import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal, WritableSignal } from '@angular/core';
import { ECElementEvent, ECharts } from 'echarts/core';

import { ChartPalette, resolveChartPalette } from './chart-palette';

/** Minimal shape of a ZRender pointer event carrying canvas-relative coordinates. */
interface ZRenderPointerEvent {
    readonly offsetX: number;
    readonly offsetY: number;
}

/** Height in pixels of the bottom strip, measured from the chart's lower edge, within
 *  which the mouse wheel steps the timeline rather than scrolling the row list. Sized to
 *  cover the timeline checkpoints and their labels with generous padding above. */
const TIMELINE_WHEEL_BAND_HEIGHT = 100;

/** Minimum gap in milliseconds between two wheel-driven timeline steps, so the burst of
 *  wheel events a single physical scroll emits advances the selection by just one checkpoint. */
const TIMELINE_STEP_COOLDOWN_MS = 120;

/** Drives a {@link EchartsChartBase.configureTimelineScroll} timeline picker from the wheel. */
interface TimelineScrollBinding {
    /** Reads the currently selected zero-based checkpoint index. */
    readonly current: () => number;
    /** Reads the live number of checkpoints on the timeline. */
    readonly count: () => number;
    /** Selects a checkpoint by its zero-based index. */
    readonly select: (index: number) => void;
}

/** Drives a {@link EchartsChartBase.configureRowScroll} category window from the wheel and slider. */
interface RowScrollBinding {
    /** Writable signal holding the zero-based topmost visible row. */
    readonly startIndex: WritableSignal<number>;
    /** Reads the live total-row count of the active category list. */
    readonly totalRows: () => number;
    /** Fixed number of rows visible at once (the window size). */
    readonly visibleCount: number;
}

/**
 * Abstract base directive for ngx-echarts chart components.
 *
 * Owns the shared scaffolding every chart component needs:
 * - theme palette resolved from CSS custom properties after the first render
 * - ECharts instance capture for imperative tooltip dispatch
 * - generic x-axis label hover/leave handlers that show/hide the tooltip
 *
 * Decorated with `@Directive()` (no selector) so Angular registers it as a
 * directive host and makes DI (`inject`, `afterNextRender`) available in the
 * constructor. Angular does NOT inherit `providers` or `imports` from a base
 * class — concrete `@Component` subclasses must declare those themselves.
 *
 * Usage:
 * ```ts
 * @Component({ providers: [ECHARTS_CORE_PROVIDER], ... })
 * export class MyChartComponent extends EchartsChartBase { ... }
 * ```
 */
@Directive()
export abstract class EchartsChartBase {
    /**
     * Theme palette resolved from the document root's `@crczp/theme` CSS custom
     * properties. ECharts draws onto a canvas and cannot resolve `var(--token)`
     * expressions, so concrete color strings are read once from `:root` — always
     * attached and themed, independent of any chart's mount timing — and held in a
     * signal that derived `chartOptions` computes read for live token colors.
     */
    protected readonly palette = signal<ChartPalette>(resolveChartPalette());

    /**
     * Host element width in pixels, tracked live so derived `chartOptions` computes
     * can size category-label truncation to the room each label actually has.
     * Zero until the first measurement, which a `ResizeObserver` delivers immediately
     * after the host is laid out.
     */
    protected readonly chartWidth = signal<number>(0);

    /** Live ECharts instance captured on `chartInit`, used for imperative tooltip dispatch. */
    private chartInstance: ECharts | null = null;

    /** Whether the pointer is currently inside the chart's drawing surface. */
    private pointerInside = false;

    /** Last pointer position over the chart, in canvas pixels, used to re-show the tooltip. */
    private pointerX = 0;
    private pointerY = 0;

    /**
     * Row-scroll binding registered via {@link configureRowScroll}, or null when the
     * chart is not a scrollable category list.
     */
    private rowScroll: RowScrollBinding | null = null;

    /**
     * Timeline-scroll binding registered via {@link configureTimelineScroll}, or null when
     * the chart has no wheel-steppable timeline picker.
     */
    private timelineScroll: TimelineScrollBinding | null = null;

    /** Timestamp of the last wheel-driven timeline step, in event-clock milliseconds. */
    private lastTimelineStepAt = 0;

    /**
     * Host element reference whose width the component tracks for responsive
     * label sizing after the first render.
     */
    private readonly hostElement = inject(ElementRef<HTMLElement>);

    /** Tears down the host-width `ResizeObserver` when the component is destroyed. */
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        /**
         * Begins tracking the host width after the initial render so derived
         * `chartOptions` computes can size category-label truncation responsively.
         */
        afterNextRender(() => this.observeWidth(this.hostElement.nativeElement));
    }

    /**
     * Observes the host element and mirrors its content width into `chartWidth`.
     * The observer fires once on registration, so the initial width is captured
     * without an explicit first read; it is disconnected on component destroy.
     *
     * @param host The component host element whose width to track.
     */
    private observeWidth(host: HTMLElement): void {
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) this.chartWidth.set(entry.contentRect.width);
        });
        observer.observe(host);
        this.destroyRef.onDestroy(() => observer.disconnect());
    }

    /**
     * Captures the ECharts instance once ngx-echarts emits `chartInit`, so
     * `onAxisLabelHover` / `onAxisLabelLeave` can dispatch tooltip actions
     * imperatively and the wheel, row-scroll, and timeline bindings can attach.
     *
     * @param instance The initialised ECharts instance emitted by ngx-echarts.
     */
    protected onChartInit(instance: ECharts): void {
        this.chartInstance = instance;
        this.keepTooltipOnOptionUpdate(instance);
        this.bindWheelScroll(instance);
        this.bindRowScrollSlider(instance);
        this.bindTimelineCursor(instance);
    }

    /**
     * Pins the chart's hover cursor to the default arrow across the whole drawing
     * surface. ECharts shows a pointer over every series mark, symbol, label, and
     * graphic element regardless of whether it responds to a click, and a series-level
     * `cursor` does not reliably reach symbols, lines, radar polygons, labels, or
     * graphic elements. For display-only charts whose marks do nothing; charts with
     * clickable marks instead set `cursor` per series or per data item so the pointer
     * appears only on those marks.
     *
     * @param instance The initialised ECharts instance whose cursor to pin.
     */
    protected pinDefaultCursor(instance: ECharts): void {
        const renderer = instance.getZr();
        renderer.on('mousemove', () => renderer.setCursorStyle('default'));
    }

    /**
     * Registers this chart as a vertically-scrollable category list driven by a
     * {@link scrollableBarDataZoom} slider. The `startIndex` signal owns the window
     * position: the mouse wheel and the slider both write to it, and the chart's option
     * builder must feed it back as the dataZoom `startValue` so the window survives
     * rebuilds. Call once, from the concrete component's constructor.
     *
     * @param startIndex   Writable signal holding the zero-based topmost visible row.
     * @param totalRows    Live count of rows in the active category list.
     * @param visibleCount Fixed number of rows visible at once (the window size).
     */
    protected configureRowScroll(
        startIndex: WritableSignal<number>,
        totalRows: () => number,
        visibleCount: number,
    ): void {
        this.rowScroll = { startIndex, totalRows, visibleCount };
    }

    /**
     * Registers this chart's bottom timeline picker as wheel-steppable: a wheel notch
     * over the timeline strip moves the selection by one checkpoint instead of requiring
     * a click. The window position lives in the component, accessed through the supplied
     * read/select callbacks so this works whether the index is a plain signal or derived
     * (e.g. defaulting to the first populated level). Call once, from the concrete
     * component's constructor.
     *
     * @param current Reads the currently selected zero-based checkpoint index.
     * @param count   Reads the live number of checkpoints on the timeline.
     * @param select  Selects a checkpoint by its zero-based index.
     */
    protected configureTimelineScroll(
        current: () => number,
        count: () => number,
        select: (index: number) => void,
    ): void {
        this.timelineScroll = { current, count, select };
    }

    /**
     * Wires mouse-wheel scrolling to the registered scroll targets, split by pointer
     * region. A wheel notch within the bottom band ({@link TIMELINE_WHEEL_BAND_HEIGHT}
     * pixels from the lower edge, where the timeline sits) steps the timeline by one
     * checkpoint, rate-limited by {@link TIMELINE_STEP_COOLDOWN_MS} so the burst of events
     * one physical scroll emits advances the selection only once; a notch anywhere above
     * the band shifts the row window by one row. ECharts' own inside-zoom wheel pan is
     * unreliable in this layout, so the wheel is handled natively. Whenever a target
     * consumes the notch the default page scroll and propagation are suppressed so the
     * surrounding page does not scroll at the same time; the page scrolls only when no
     * target consumes the notch (outside the band with a non-overflowing or absent list).
     *
     * @param instance The ECharts instance to bind the wheel listener to.
     */
    private bindWheelScroll(instance: ECharts): void {
        const rows = this.rowScroll;
        const timeline = this.timelineScroll;
        if (rows === null && timeline === null) return;
        const dom = instance.getDom();

        const onWheel = (event: WheelEvent): void => {
            const step = event.deltaY > 0 ? 1 : -1;
            const rect = dom.getBoundingClientRect();
            const inTimelineBand = event.clientY - rect.top >= rect.height - TIMELINE_WHEEL_BAND_HEIGHT;
            let consumed = false;
            if (timeline !== null && inTimelineBand && timeline.count() > 1) {
                consumed = true;
                if (event.timeStamp - this.lastTimelineStepAt >= TIMELINE_STEP_COOLDOWN_MS) {
                    if (this.stepTimeline(instance, timeline, step)) this.lastTimelineStepAt = event.timeStamp;
                }
            } else if (rows !== null) {
                consumed = this.scrollRows(rows, step);
            }
            if (consumed) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        dom.addEventListener('wheel', onWheel, { passive: false });
        this.destroyRef.onDestroy(() => dom.removeEventListener('wheel', onWheel));
    }

    /**
     * Steps the registered timeline by one checkpoint, clamped to its bounds, and moves
     * the native timeline to match so the visual selection tracks the wheel.
     *
     * @param instance The ECharts instance whose timeline to move.
     * @param binding  The timeline read/select callbacks.
     * @param step     Direction to move: +1 for a downward notch, -1 for upward.
     * @returns True when the selection changed (the notch is consumed), false at a bound.
     */
    private stepTimeline(instance: ECharts, binding: TimelineScrollBinding, step: number): boolean {
        const count = binding.count();
        if (count <= 1) return false;
        const current = binding.current();
        const next = Math.min(count - 1, Math.max(0, current + step));
        if (next === current) return false;
        binding.select(next);
        instance.dispatchAction({ type: 'timelineChange', currentIndex: next });
        return true;
    }

    /**
     * Shifts the registered row window by one row, clamped to the scrollable range.
     *
     * @param binding The row-scroll window callbacks and signal.
     * @param step    Direction to move: +1 for a downward notch, -1 for upward.
     * @returns True when the list can scroll (the notch is consumed), false when it fits.
     */
    private scrollRows(binding: RowScrollBinding, step: number): boolean {
        const maxStart = Math.max(0, binding.totalRows() - binding.visibleCount);
        if (maxStart <= 0) return false;
        binding.startIndex.set(Math.min(maxStart, Math.max(0, binding.startIndex() + step)));
        return true;
    }

    /**
     * Mirrors a slider drag back into the registered row-scroll signal so a dragged window
     * survives chart rebuilds. The slider emits ECharts' `datazoom`; its resulting window
     * start is read and clamped into the signal. No-op when no row scroll is registered.
     *
     * @param instance The ECharts instance to bind the dataZoom listener to.
     */
    private bindRowScrollSlider(instance: ECharts): void {
        const binding = this.rowScroll;
        if (binding === null) return;
        const maxStart = (): number => Math.max(0, binding.totalRows() - binding.visibleCount);
        const clamp = (index: number): number => Math.min(maxStart(), Math.max(0, index));

        instance.on('datazoom', () => {
            const option = instance.getOption() as {
                dataZoom?: ReadonlyArray<{ startValue?: number; start?: number }>;
            };
            const zoom = option.dataZoom?.[0];
            if (zoom === undefined) return;
            if (typeof zoom.startValue === 'number') {
                binding.startIndex.set(clamp(Math.round(zoom.startValue)));
            } else if (typeof zoom.start === 'number') {
                binding.startIndex.set(clamp(Math.round((zoom.start / 100) * (binding.totalRows() - 1))));
            }
        });
    }

    /**
     * Shows a horizontal-resize cursor while the pointer is over the wheel-steppable
     * timeline band, signalling that the wheel scrolls the left-to-right selection there,
     * and restores the default cursor once on leaving the band so clickable marks elsewhere
     * keep their own cursor. No-op when no timeline scroll is registered.
     *
     * @param instance The ECharts instance whose cursor to drive over the timeline band.
     */
    private bindTimelineCursor(instance: ECharts): void {
        const binding = this.timelineScroll;
        if (binding === null) return;
        const renderer = instance.getZr();
        let wasInBand = false;
        renderer.on('mousemove', (event: ZRenderPointerEvent) => {
            const inBand =
                binding.count() > 1 && event.offsetY >= instance.getHeight() - TIMELINE_WHEEL_BAND_HEIGHT;
            if (inBand) {
                renderer.setCursorStyle('ew-resize');
                wasInBand = true;
            } else if (wasInBand) {
                renderer.setCursorStyle('default');
                wasInBand = false;
            }
        });
    }

    /**
     * Keeps an open tooltip visible across live option updates. ngx-echarts re-applies the
     * full option via `setOption` on every data refresh, which dismisses any showing tooltip
     * until the next pointer move. This tracks the pointer over the chart and re-issues
     * `showTip` at that position immediately after each `setOption`, so a tooltip the user is
     * reading reappears instantly instead of blanking until they move the mouse. Using pixel
     * coordinates makes it work for both axis-trigger and item-trigger tooltips.
     *
     * @param instance The ECharts instance whose option updates to bridge.
     */
    private keepTooltipOnOptionUpdate(instance: ECharts): void {
        const renderer = instance.getZr();
        renderer.on('mousemove', (event: ZRenderPointerEvent) => {
            this.pointerInside = true;
            this.pointerX = event.offsetX;
            this.pointerY = event.offsetY;
        });
        renderer.on('globalout', () => {
            this.pointerInside = false;
        });

        const applyOption = instance.setOption.bind(instance) as (...args: unknown[]) => unknown;
        (instance as unknown as { setOption: (...args: unknown[]) => unknown }).setOption = (
            ...args: unknown[]
        ): unknown => {
            const result = applyOption(...args);
            if (this.pointerInside) {
                instance.dispatchAction({ type: 'showTip', x: this.pointerX, y: this.pointerY });
            }
            return result;
        };
    }

    /**
     * Reveals the full category label by showing the shared tooltip when the
     * pointer enters a (possibly truncated) x-axis label. Maps the hovered
     * label value to a data index via `axisLabels()`, then dispatches
     * `showTip` targeting `seriesIndex: 0` — sufficient for single-series
     * charts; multi-series subclasses should override this method if needed.
     *
     * @param event ECharts element event; ignored unless it targets the x-axis.
     */
    protected onAxisLabelHover(event: ECElementEvent): void {
        if (event.componentType !== 'xAxis') return;
        const index = this.axisLabels().indexOf(String(event.value));
        if (index < 0) return;
        this.chartInstance?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: index });
    }

    /**
     * Hides the tooltip when the pointer leaves an x-axis label.
     *
     * @param event ECharts element event; ignored unless it targets the x-axis.
     */
    protected onAxisLabelLeave(event: ECElementEvent): void {
        if (event.componentType !== 'xAxis') return;
        this.chartInstance?.dispatchAction({ type: 'hideTip' });
    }

    /**
     * Returns the ordered list of x-axis category labels used to map a hovered
     * label value back to its data index for tooltip dispatch.
     *
     * Subclasses with a category x-axis should override this to return their
     * current label array. Charts without a category axis can leave this as-is;
     * the default empty array means hover events are silently ignored.
     *
     * **Contract for overrides:** the returned array MUST equal the array
     * passed to `xAxis.data` in `chartOptions` — same values, same order.
     * The hover handler maps `event.value` to a data index by position
     * (`indexOf`); any divergence causes the tooltip to target the wrong
     * data point or miss entirely, with no runtime error to signal the bug.
     *
     * @returns Ordered label strings matching the x-axis `data` array.
     */
    protected axisLabels(): readonly string[] {
        return [];
    }
}
