import { CustomSeriesOption } from 'echarts';
import { BAR_HEIGHT_PX } from '../../config/ui.config';

/**
 * Shared bar-geometry primitives. Both the skeleton bars builder and
 * the live bars builder (forthcoming) compose against these helpers so
 * the time-range data layout, the `api.coord`-driven rect geometry, and
 * the engine-driven right-edge growth animation stay in one place.
 *
 * Engine-driven motion is global to the visualization: every in-progress
 * bar (placeholder or live) animates its right edge from a mount-time
 * snapshot to the axis end in real time via a single zrender
 * `keyframeAnimation` baked at render. The rendering layer dispatches
 * `setOption` once at mount and ECharts' RAF loop owns visual
 * progression. The live builder will overlay lag-state styling,
 * level-type half-pill icons, and the diagonal-stripe estimate overlay
 * on top of the same animated rect.
 */

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
 * Translates a time range plus row index into pixel coordinates,
 * vertically centred on the row at `height` thickness.
 *
 * @param api - The `renderItem` API providing `coord([xValue, yValue])`.
 * @param startMs - Bar's left edge as a millisecond timestamp.
 * @param endMs - Bar's right edge as a millisecond timestamp.
 * @param rowIndex - Y-axis category index for the bar's row.
 * @param height - Pixel height of the rect. Defaults to `BAR_HEIGHT_PX`.
 * @returns Pixel-space rect ready for a zrender `rect` shape.
 */
export function computeBarRect(
    api: CoordResolver,
    startMs: number,
    endMs: number,
    rowIndex: number,
    height: number = BAR_HEIGHT_PX,
): BarRect {
    const startPoint = api.coord([startMs, rowIndex]);
    const endPoint = api.coord([endMs, rowIndex]);
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
 * data shape, encode hint, animation flag, and clip flag. Live and
 * skeleton builders spread this into their series and override the
 * mode-specific fields (`silent`, `cursor`, `renderItem`, ...).
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
): Pick<CustomSeriesOption, 'type' | 'data' | 'encode' | 'animation' | 'clip'> {
    return {
        type: 'custom',
        data: [makeBarRangeData(startMs, endMs, rowIndex)],
        encode: BAR_RANGE_ENCODE,
        animation: false,
        clip: true,
    };
}

/**
 * One keyframe of a zrender shape animation. The optional `easing`
 * selects the curve applied from the previous keyframe to this one.
 * Shape fields are partial so callers can animate any subset of a
 * zrender element's `shape` properties.
 */
export interface BarShapeKeyframe {
    readonly percent: number;
    readonly easing?: string;
    readonly shape: Partial<BarRect>;
}

/**
 * One entry in a zrender element's `keyframeAnimation` array. Models
 * the shape-animating variant used by the bar-growth pattern; opacity
 * animations (the skeleton mount fade-in and shimmer) keep their own
 * `style`-based shape inside the skeleton builder.
 */
export interface BarShapeAnimation {
    readonly duration: number;
    readonly loop: boolean;
    readonly delay: number;
    readonly easing?: string;
    readonly keyframes: readonly BarShapeKeyframe[];
}

/**
 * Builds the right-edge growth keyframe animation entry. Animates the
 * rect's `shape.width` from its width at `mountNowMs` to its width at
 * `axisEndMs` over the matching real-time duration with linear easing,
 * single non-looping cycle. After the cycle completes zrender leaves
 * the shape at the final width — the bar visually rests against the
 * axis right edge.
 *
 * Both modes consume this helper: the skeleton bars builder for its
 * placeholder rects, and the live bars builder for in-progress runs.
 * Either caller must independently emit the initial rect with
 * `shape.width` set to the mount-time width — the animation overwrites
 * `width` per frame from `percent: 0` onward, but the initial render
 * before the first frame uses the rect's own `shape.width`.
 *
 * @param api        - The `renderItem` API providing `coord([xValue, yValue])`.
 * @param startMs    - Bar's left edge as a millisecond timestamp.
 * @param mountNowMs - Wall-clock timestamp captured at feed binding,
 *                     used as the `percent: 0` width anchor.
 * @param axisEndMs  - Axis right edge as a millisecond timestamp, used
 *                     as the `percent: 1` width anchor and as the real-
 *                     time animation duration when subtracted from
 *                     `mountNowMs`.
 * @param rowIndex   - Y-axis category index for the bar's row.
 * @returns A single keyframe-animation entry. Empty `keyframes` array
 *          and zero duration when `axisEndMs <= mountNowMs` (the bar
 *          would already rest at the axis edge); callers can spread
 *          the result into a `keyframeAnimation` array unconditionally.
 */
export function buildBarRightEdgeAnimation(
    api: CoordResolver,
    startMs: number,
    mountNowMs: number,
    axisEndMs: number,
    rowIndex: number,
): BarShapeAnimation {
    const initialWidth = computeBarWidthBetween(api, startMs, mountNowMs, rowIndex);
    const finalWidth = computeBarWidthBetween(api, startMs, axisEndMs, rowIndex);
    const duration = Math.max(0, axisEndMs - mountNowMs);

    return {
        duration,
        loop: false,
        delay: 0,
        easing: 'linear',
        keyframes: [
            { percent: 0, shape: { width: initialWidth } },
            { percent: 1, shape: { width: finalWidth } },
        ],
    };
}

/**
 * Pixel width between two timestamps on a bar's row. The row index is
 * passed through because Y category resolution can affect the X
 * coordinate basis on some axis configurations; passing the row keeps
 * the result identical to `computeBarRect(...).width`.
 *
 * @param api      - The `renderItem` API.
 * @param fromMs   - Left edge timestamp.
 * @param toMs     - Right edge timestamp.
 * @param rowIndex - Y-axis category index.
 * @returns The pixel width, clamped non-negative.
 */
export function computeBarWidthBetween(
    api: CoordResolver,
    fromMs: number,
    toMs: number,
    rowIndex: number,
): number {
    const fromPoint = api.coord([fromMs, rowIndex]);
    const toPoint = api.coord([toMs, rowIndex]);
    const fromX = fromPoint[0] ?? 0;
    const toX = toPoint[0] ?? 0;
    return Math.max(0, toX - fromX);
}
