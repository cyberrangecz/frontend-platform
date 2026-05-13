import { CustomSeriesOption, EChartsOption } from 'echarts';
import { OptionFragment } from '../types/option-fragment.types';

/**
 * Stroke color of the marker line. Matches the legacy value preserved
 * across the rework; replaced with a theme variable when live mode
 * lands.
 */
const MARKER_LINE_COLOR = '#0b0b0b';

/**
 * Stroke width of the marker line in pixels.
 */
const MARKER_LINE_WIDTH = 2;

/**
 * One keyframe entry on the marker `keyframeAnimation`. The optional
 * `easing` selects the curve applied from the previous keyframe.
 */
interface MarkerShapeKeyframe {
    readonly percent: number;
    readonly easing?: string;
    readonly shape: { readonly x1: number; readonly x2: number };
}

/**
 * One entry of the marker's `keyframeAnimation` array.
 */
interface MarkerShapeAnimation {
    readonly duration: number;
    readonly loop: boolean;
    readonly delay: number;
    readonly easing?: string;
    readonly keyframes: readonly MarkerShapeKeyframe[];
}

/**
 * Strict shape returned by the marker's `renderItem`. Carries the
 * `keyframeAnimation` field accepted at runtime by ECharts 5.4+ on
 * custom-series render returns. The final `as unknown as` cast in the
 * builder is the single, narrow type-system escape needed to satisfy
 * upstream typings.
 */
interface KeyframeAnimatedLine {
    readonly type: 'line';
    readonly shape: {
        readonly x1: number;
        readonly y1: number;
        readonly x2: number;
        readonly y2: number;
    };
    readonly style: { readonly stroke: string; readonly lineWidth: number };
    readonly keyframeAnimation: readonly MarkerShapeAnimation[];
}

/**
 * Alias for the upstream `renderItem` return type.
 */
type CustomRenderItemReturn = ReturnType<NonNullable<CustomSeriesOption['renderItem']>>;

/**
 * Minimal surface the marker needs from ECharts' `renderItem` params:
 * the plot-area coordinate-system rect for sizing the vertical line.
 */
interface MarkerRenderItemParams {
    readonly coordSys: {
        readonly y: number;
        readonly height: number;
    };
}

/**
 * Minimal surface the marker needs from ECharts' `renderItem` API.
 */
interface MarkerRenderItemApi {
    coord(point: [number, number]): number[];
}

/**
 * Builds the current-time marker fragment. The marker is a single
 * `type: 'custom'` series with one data point and a closure-captured
 * `renderItem` returning a vertical line whose `shape.x1` and
 * `shape.x2` are engine-animated from the pixel of `mountNowMs` to the
 * pixel of `axisEndMs` over the matching real-time duration with
 * linear easing.
 *
 * The chart paints once at mount and zrender's RAF loop owns the
 * marker's per-frame position. The series carries no time label — a
 * live `HH:mm:ss` clock would require either re-dispatching every
 * second (defeats the engine-driven design) or a parallel DOM/graphic
 * update; the clock concern moves out of the chart entirely, surfaced
 * separately when needed.
 *
 * When `show === false`, returns an empty `series` array — combined
 * with renderer-side `replaceMerge: ['series']` this clears any
 * previous marker.
 *
 * Shares the `'currentTimeMarker'` fragment key across modes so live-
 * mode batches replace this fragment when the marker visibility flips
 * (e.g. all training runs finished).
 *
 * @param mountNowMs - Wall-clock timestamp captured at feed binding;
 *                     the `percent: 0` anchor of the marker animation.
 * @param axisEndMs  - Axis right edge; the `percent: 1` anchor of the
 *                     marker animation and the upper bound of the
 *                     real-time animation duration.
 * @param show       - When `false` the fragment carries an empty
 *                     series array, hiding any previously rendered
 *                     marker.
 * @returns A fragment keyed `'currentTimeMarker'`.
 */
export function buildCurrentTimeMarkerFragment(
    mountNowMs: number,
    axisEndMs: number,
    show: boolean,
): OptionFragment {
    const series: CustomSeriesOption[] = show
        ? [buildMarkerSeries(mountNowMs, axisEndMs)]
        : [];

    const fragment: Partial<EChartsOption> = {
        series,
    };

    return {
        key: 'currentTimeMarker',
        fragment,
    };
}

/**
 * Builds the marker's single custom series. `renderItem` closure-
 * captures `mountNowMs` and `axisEndMs`, computes the pixel range
 * through `api.coord`, and emits the line shape with the keyframe
 * animation attached.
 *
 * @param mountNowMs - Animation start anchor.
 * @param axisEndMs  - Animation end anchor.
 * @returns A custom series option drawing a single animated line.
 */
function buildMarkerSeries(
    mountNowMs: number,
    axisEndMs: number,
): CustomSeriesOption {
    return {
        type: 'custom',
        data: [[mountNowMs, 0]],
        encode: { x: 0, y: 1 },
        animation: false,
        clip: true,
        silent: true,
        z: 10,
        renderItem: (paramsRaw, apiRaw) => {
            const params = paramsRaw as unknown as MarkerRenderItemParams;
            const api = apiRaw as unknown as MarkerRenderItemApi;

            const startPoint = api.coord([mountNowMs, 0]);
            const endPoint = api.coord([axisEndMs, 0]);
            const startX = startPoint[0] ?? 0;
            const endX = endPoint[0] ?? 0;
            const yTop = params.coordSys.y;
            const yBottom = params.coordSys.y + params.coordSys.height;
            const duration = Math.max(0, axisEndMs - mountNowMs);

            const line: KeyframeAnimatedLine = {
                type: 'line',
                shape: { x1: startX, y1: yTop, x2: startX, y2: yBottom },
                style: { stroke: MARKER_LINE_COLOR, lineWidth: MARKER_LINE_WIDTH },
                keyframeAnimation: [
                    {
                        duration,
                        loop: false,
                        delay: 0,
                        easing: 'linear',
                        keyframes: [
                            { percent: 0, shape: { x1: startX, x2: startX } },
                            { percent: 1, shape: { x1: endX, x2: endX } },
                        ],
                    },
                ],
            };

            return line as unknown as CustomRenderItemReturn;
        },
    };
}
