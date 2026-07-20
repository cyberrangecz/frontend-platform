import { CustomSeriesOption } from 'echarts';
import { BAR_HEIGHT_PX } from '../../config/ui.config';
import { LagState } from '../../types/lag-state.types';

/**
 * Shared bar-geometry primitives. The bars builder composes against these
 * helpers so the time-range data layout, the `api.coord`-driven rect
 * geometry, and the lag-state height scale stay in one place.
 *
 * Each completed bar is drawn as a static rect spanning its run. The
 * growing right edge of an in-progress bar is not a series animation; the
 * renderer paints an imperative `graphic.Rect` overlay per running bar and
 * repositions it against `Date.now()`. The builder overlays lag-state
 * styling, level-type half-pill icons, and the diagonal-stripe estimate
 * overlay on top of the rect.
 */

/**
 * Z-order assigned to every bar custom series so that per-element `z2`
 * values control intra-bar paint order (body, estimate stripes, pill/icon)
 * while run caps (z 8) and event icons (z ≥ 10) sit above all bar layers.
 */
const BAR_SERIES_Z = 2;

/**
 * Scale factor applied to {@link BAR_HEIGHT_PX} for the inactive lag
 * states (`INACTIVE`, `INACTIVE_HIGHLIGHTED`) per visuals.md §Lag-state
 * Colors & Bar Heights — dimmed rows render shorter than the default.
 */
const INACTIVE_HEIGHT_SCALE = 0.6;

/**
 * Scale factor applied to {@link BAR_HEIGHT_PX} for in-progress bars per
 * visuals.md §Lag-state Colors & Bar Heights — running rows render
 * slightly taller than the default to draw the eye.
 */
const RUNNING_HEIGHT_SCALE = 1.1;

/**
 * Scale factor applied to {@link BAR_HEIGHT_PX} for completed bars —
 * the resting visual baseline.
 */
const DEFAULT_HEIGHT_SCALE = 1.0;

/**
 * Minimum pixel height enforced on a rendered rect. Prevents very short
 * levels from collapsing to an invisible 0-px sliver after the height
 * scale is applied. Sourced from visuals.md §Bar Segments.
 */
export const MIN_BAR_HEIGHT_PX = 2;

/**
 * Resolves the rect's pixel height from the effective lag state and
 * whether the bar is currently running.
 *
 * Inactive states render shorter, running rows render taller, everything
 * else sits on the default baseline. The result is always clamped to
 * {@link MIN_BAR_HEIGHT_PX} so no path can produce an invisible 0-px sliver.
 * Sourced from visuals.md §Lag-state Colors & Bar Heights.
 *
 * Each call site is responsible for resolving its own effective lag state
 * before calling this function, because live bars and estimate overlays
 * use different state-resolution rules (highlight handling differs).
 *
 * @param isRunning - Whether the bar/overlay represents an in-progress run.
 * @param state     - The already-resolved effective lag state.
 * @returns Pixel height, clamped to at least {@link MIN_BAR_HEIGHT_PX}.
 */
export function resolveBarHeightPx(isRunning: boolean, state: LagState): number {
    let scaled: number;
    if (state === 'INACTIVE' || state === 'INACTIVE_HIGHLIGHTED') {
        scaled = BAR_HEIGHT_PX * INACTIVE_HEIGHT_SCALE;
    } else if (isRunning) {
        scaled = BAR_HEIGHT_PX * RUNNING_HEIGHT_SCALE;
    } else {
        scaled = BAR_HEIGHT_PX * DEFAULT_HEIGHT_SCALE;
    }
    return Math.max(scaled, MIN_BAR_HEIGHT_PX);
}

/**
 * Single bar's pixel rectangle, ready to drop into a zrender `rect`
 * shape descriptor.
 */
export interface BarRect {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/**
 * Range-encoded data triple consumed by ECharts for axis-extent and
 * tooltip hit-testing. `renderItem` ignores it — geometry is computed
 * from the closure-captured row instead.
 */
export type BarRangeData = readonly [startMs: number, endMs: number, rowIndex: number];

/**
 * Encode hint paired with `BarRangeData`: X spans `[0, 1]` (start..end);
 * Y reads the row index at slot `2`. Typed loosely to satisfy ECharts'
 * `OptionEncode` (which requires mutable arrays); callers must not
 * mutate the exported value.
 */
export const BAR_RANGE_ENCODE: { x: number[]; y: number } = { x: [0, 1], y: 2 };

/**
 * Minimal API surface this module needs from ECharts' `renderItem` API
 * argument. Modelled locally so the helper stays decoupled from the
 * concrete `CustomSeriesRenderItemAPI` type, which varies across
 * ECharts minor versions. The parameter and return types match the
 * upstream `OptionDataValue[]` / `number[]` mutability so passing an
 * actual `CustomSeriesRenderItemAPI` here is structurally assignable.
 */
interface CoordResolver {
    coord(point: [number, number]): number[];
}

/**
 * Builds the range-encoded data triple for one bar.
 *
 * @param startMs - Bar's left edge as a millisecond timestamp.
 * @param endMs - Bar's right edge as a millisecond timestamp.
 * @param rowIndex - Y-axis category index for the bar's row.
 * @returns The `BarRangeData` triple.
 */
export function makeBarRangeData(
    startMs: number,
    endMs: number,
    rowIndex: number,
): BarRangeData {
    return [startMs, endMs, rowIndex];
}

/**
 * Translates an axis-space X range plus row index into pixel coordinates,
 * vertically centred on the row at `height` thickness. The X values are
 * already in axis space (mapped through the active time scale by the caller),
 * so the `renderItem` API resolves them directly.
 *
 * @param api - The `renderItem` API providing `coord([xValue, yValue])`.
 * @param startValue - Bar's left edge as an axis-space X value.
 * @param endValue - Bar's right edge as an axis-space X value.
 * @param rowIndex - Y-axis category index for the bar's row.
 * @param height - Pixel height of the rect. Defaults to `BAR_HEIGHT_PX`.
 * @returns Pixel-space rect ready for a zrender `rect` shape.
 */
export function computeBarRect(
    api: CoordResolver,
    startValue: number,
    endValue: number,
    rowIndex: number,
    height: number = BAR_HEIGHT_PX,
): BarRect {
    const startPoint = api.coord([startValue, rowIndex]);
    const endPoint = api.coord([endValue, rowIndex]);
    const startX = startPoint[0] ?? 0;
    const startY = startPoint[1] ?? 0;
    const endX = endPoint[0] ?? 0;
    const halfHeight = height / 2;

    return {
        x: startX,
        y: startY - halfHeight,
        width: endX - startX,
        height,
    };
}

/**
 * Common option fields every bar custom series carries: range-encoded
 * data shape, encode hint, animation flag, and clip flag. The bars
 * builder spreads this into its series and overrides the series-specific
 * fields (`silent`, `cursor`, `renderItem`, ...).
 *
 * @param startMs - Bar's left edge as a millisecond timestamp.
 * @param endMs - Bar's right edge as a millisecond timestamp.
 * @param rowIndex - Y-axis category index for the bar's row.
 * @returns Partial custom-series options shared by both modes.
 */
export function createBarSeriesShell(
    startMs: number,
    endMs: number,
    rowIndex: number,
): Pick<CustomSeriesOption, 'type' | 'data' | 'encode' | 'clip' | 'z'> {
    return {
        type: 'custom',
        data: [makeBarRangeData(startMs, endMs, rowIndex)],
        encode: BAR_RANGE_ENCODE,
        clip: true,
        z: BAR_SERIES_Z,
    };
}
