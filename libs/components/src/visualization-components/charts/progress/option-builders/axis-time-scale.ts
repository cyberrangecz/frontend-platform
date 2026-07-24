import { format } from 'date-fns';
import { formatClock } from '../../shared';
import { AXIS_PADDING_MS } from '../config/ui.config';
import { BarVm } from '../types/bar.types';
import { AxisMode } from '../types/ui-state.types';
import { AxisVm } from '../types/view-model.types';
import { deriveStartAnchors } from '../selectors/start-anchors';

/**
 * Minimal slice of the ECharts instance the time scale needs to resolve an
 * axis-space value to a horizontal pixel. Modelled locally so the time scale
 * stays decoupled from the full `ECharts` type; a real instance is
 * structurally assignable.
 */
export interface PixelConverter {
    convertToPixel(finder: { xAxisIndex: number }, value: number): number | number[];
}

/**
 * Render-time X-axis time scale: the single seam that maps absolute epoch-ms
 * onto the chart's X-axis space and renders that space as text. Concrete
 * implementations vary only the scalar mapping ({@link toAxisValue}), the axis
 * domain, the tick text, and now-marker visibility.
 *
 * {@link toAxisValue} is the one mapping primitive: every coordinate that
 * enters ECharts passes through it exactly once, where it enters — encode-data
 * builders map at construction and read the mapped value back via
 * `api.value(...)`; per-series renderItems map their own values before
 * resolving pixels. There is no second coordinate path to mis-pick.
 *
 * Two implementations are selected per compose by the active axis mode:
 * {@link AbsoluteTimeScale} (identity — wall-clock timeline) and
 * {@link DurationTimeScale} (per-row run-start re-anchoring).
 */
export abstract class AxisTimeScale {
    /** Lower bound of the X-axis in axis space. */
    abstract readonly axisMin: number;

    /** Upper bound of the X-axis in axis space. */
    abstract readonly axisMax: number;

    /** Whether the global current-time marker is meaningful in this mode. */
    abstract readonly showNowMarker: boolean;

    /**
     * Maps an absolute epoch-millisecond instant on a given row to its
     * axis-space value. Encode-data triples are built through this so ECharts'
     * axis extent and tooltip hit-testing operate in the same space the axis
     * is scaled to.
     *
     * @param absoluteMs Absolute epoch-millisecond instant.
     * @param rowIndex Y-axis row the value belongs to.
     * @returns The value in axis space.
     */
    abstract toAxisValue(absoluteMs: number, rowIndex: number): number;

    /**
     * Renders an axis-space value as an X-axis tick / pointer label.
     *
     * @param value Axis-space value (already mapped).
     * @returns The label text.
     */
    abstract formatAxisLabel(value: number): string;

    /**
     * Renders an axis-space value as a horizontal data-zoom slider label.
     *
     * @param value Axis-space value (already mapped).
     * @returns The label text, or an empty string when the position should carry no label.
     */
    abstract formatSliderLabel(value: number): string;

    /**
     * Resolves the horizontal pixel of an absolute instant on a given row, for
     * imperative zrender overlays positioned outside the option model.
     *
     * @param instance The live chart, used for the axis pixel transform.
     * @param absoluteMs Absolute epoch-millisecond instant.
     * @param rowIndex Y-axis row the value belongs to.
     * @returns The horizontal pixel; `NaN` when the axis transform yields no
     *          finite pixel (e.g. before the first option lands).
     */
    pixelX(instance: PixelConverter, absoluteMs: number, rowIndex: number): number {
        const raw = instance.convertToPixel({ xAxisIndex: 0 }, this.toAxisValue(absoluteMs, rowIndex));
        return Array.isArray(raw) ? raw[0] ?? NaN : raw;
    }
}

/**
 * Identity time scale: the wall-clock timeline. Axis space equals absolute
 * epoch-ms, so every coordinate helper is a pass-through and the labels read
 * clock time. This is the existing chart behaviour expressed through the
 * time-scale seam.
 */
export class AbsoluteTimeScale extends AxisTimeScale {
    override readonly axisMin: number;
    override readonly axisMax: number;
    override readonly showNowMarker = true;

    private readonly spansMidnight: boolean;

    constructor(axis: AxisVm) {
        super();
        this.axisMin = axis.startMs;
        this.axisMax = axis.endMs;
        this.spansMidnight = axis.spansMidnight;
    }

    override toAxisValue(absoluteMs: number): number {
        return absoluteMs;
    }

    override formatAxisLabel(value: number): string {
        return format(new Date(value), this.spansMidnight ? 'MMM d HH:mm:ss' : 'HH:mm:ss');
    }

    override formatSliderLabel(value: number): string {
        if (Number.isNaN(value)) {
            return '';
        }
        const date = new Date(value);
        return this.spansMidnight
            ? format(date, 'MMM d') + '\n' + format(date, 'HH:mm:ss')
            : format(date, 'HH:mm:ss');
    }
}

/**
 * Duration time scale: per-row run-start re-anchoring. Every row's run-start
 * instant maps to `t=0`, so axis space reads elapsed time and runs compare by
 * length regardless of when they started. Labels read elapsed duration; the
 * global now-marker is hidden because a single wall-clock instant has no
 * meaning across independently-anchored rows.
 */
export class DurationTimeScale extends AxisTimeScale {
    override readonly axisMin = -AXIS_PADDING_MS;
    override readonly axisMax: number;
    override readonly showNowMarker = false;

    private readonly anchorMsByRow: ReadonlyMap<number, number>;

    constructor(axis: AxisVm, bars: readonly BarVm[]) {
        super();
        const anchorMsByRow = new Map<number, number>();
        for (const anchor of deriveStartAnchors(bars).values()) {
            anchorMsByRow.set(anchor.rowIndex, anchor.anchorMs);
        }
        this.anchorMsByRow = anchorMsByRow;

        // Live current-time instant within the padded axis window.
        const liveNowMs = axis.endMs - AXIS_PADDING_MS;
        let maxElapsed = 0;
        for (const bar of bars) {
            const endMs = bar.isRunning ? liveNowMs : bar.effectiveEnd;
            const elapsed = endMs - (this.anchorMsByRow.get(bar.rowIndex) ?? 0);
            if (elapsed > maxElapsed) {
                maxElapsed = elapsed;
            }
        }
        this.axisMax = maxElapsed + AXIS_PADDING_MS;
    }

    override toAxisValue(absoluteMs: number, rowIndex: number): number {
        return absoluteMs - (this.anchorMsByRow.get(rowIndex) ?? 0);
    }

    override formatAxisLabel(value: number): string {
        return formatClock(value);
    }

    override formatSliderLabel(value: number): string {
        if (Number.isNaN(value) || value < 0) {
            return '';
        }
        return formatClock(value);
    }
}

/**
 * Selects the axis time scale for the active mode, built once per compose.
 *
 * @param mode Active axis scale mode.
 * @param axis Axis view-model slice carrying the window bounds and live now.
 * @param bars All bar view-models, for per-row run-start anchors and the
 *             duration domain.
 * @returns The {@link AbsoluteTimeScale} or {@link DurationTimeScale} instance.
 */
export function createAxisTimeScale(
    mode: AxisMode,
    axis: AxisVm,
    bars: readonly BarVm[],
): AxisTimeScale {
    return mode === 'duration'
        ? new DurationTimeScale(axis, bars)
        : new AbsoluteTimeScale(axis);
}
