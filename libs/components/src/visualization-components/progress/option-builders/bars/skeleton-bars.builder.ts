import { CustomSeriesOption, EChartsOption } from 'echarts';
import {
    SKELETON_FADE_IN_DURATION_MS,
    SKELETON_FADE_IN_EASING,
    SKELETON_FADE_IN_STAGGER_MS,
    SKELETON_FILL_COLOR,
    SKELETON_KEYFRAME_DURATION_MS,
    SKELETON_OPACITY_MAX,
    SKELETON_OPACITY_MIN,
    SKELETON_ROW_PHASE_OFFSET_MS,
    SKELETON_SHIMMER_EASING,
} from '../../config/skeleton.config';
import { OptionFragment } from '../../types/option-fragment.types';
import { AxisVm, PlaceholderRowVm } from '../../types/view-model.types';
import {
    BarRect,
    BarShapeAnimation,
    buildBarRightEdgeAnimation,
    computeBarRect,
    createBarSeriesShell,
} from './bar-geometry';

/**
 * Strict shape of a single opacity-animating keyframe. The optional
 * `easing` field selects the curve applied from the previous keyframe
 * to this one (zrender semantics).
 */
interface SkeletonOpacityKeyframe {
    readonly percent: number;
    readonly easing?: string;
    readonly style: { readonly opacity: number };
}

/**
 * One opacity-animating entry on the rect's `keyframeAnimation` array.
 * Skeleton uses two of these — the mount fade-in and the looping
 * shimmer — alongside the shared right-edge growth entry.
 */
interface SkeletonOpacityAnimation {
    readonly duration: number;
    readonly loop: boolean;
    readonly delay: number;
    readonly easing?: string;
    readonly keyframes: readonly SkeletonOpacityKeyframe[];
}

/**
 * Strict shape of the rect returned by the skeleton `renderItem`. Carries
 * the extra `keyframeAnimation` field accepted at runtime by ECharts
 * 5.4+ on custom-series render returns. Three entries stack: mount
 * fade-in (opacity), looping shimmer (opacity), and right-edge growth
 * (shape.width, sourced from the shared `bar-geometry` helper).
 */
interface KeyframeAnimatedRect {
    readonly type: 'rect';
    readonly shape: BarRect;
    readonly style: { readonly fill: string; readonly opacity: number };
    readonly keyframeAnimation: readonly (SkeletonOpacityAnimation | BarShapeAnimation)[];
}

/**
 * Alias for the upstream `renderItem` return type.
 */
type CustomRenderItemReturn = ReturnType<NonNullable<CustomSeriesOption['renderItem']>>;

/**
 * Skeleton-mode bars fragment. One `type: 'custom'` series per
 * placeholder row, each drawing a single light-gray rect.
 *
 * Geometry (data layout, encode hint, rect translation, right-edge
 * growth animation) is shared with the live bars builder via
 * `./bar-geometry`. Skeleton-specific concerns — fill colour,
 * `silent: true`, mount fade-in, and looping shimmer — live here.
 *
 * Three animations stack on every rect:
 *   1. A one-shot mount fade-in (`loop: false`, `cubicOut`) brings the
 *      rect from `opacity: 0` up to `SKELETON_OPACITY_MIN`. Rows
 *      stagger by `SKELETON_FADE_IN_STAGGER_MS` so they cascade in.
 *   2. A looping shimmer (`loop: true`, `sinusoidalInOut`) breathes
 *      between `SKELETON_OPACITY_MIN` and `SKELETON_OPACITY_MAX`. The
 *      loop's `delay` is the fade-in duration plus the per-row phase
 *      offset, so each row's first shimmer cycle begins right where
 *      its fade-in lands.
 *   3. A right-edge growth animation (`loop: false`, `linear`) from
 *      `axis.mountNowMs` to `axis.endMs` over real time — the bar's
 *      right edge advances in lock-step with the current-time marker.
 *
 * Shares the `'bars'` fragment key with the live-mode builder so mode
 * switches replace the series array via the renderer's
 * `replaceMerge: ['series']`.
 *
 * @param placeholders - Placeholder rows from the skeleton view-model.
 * @param axis         - Axis view-model slice — carries `mountNowMs`
 *                       (animation anchor) and `endMs` (animation target).
 * @returns A fragment keyed `'bars'` with one custom series per row.
 */
export function buildSkeletonBarsFragment(
    placeholders: readonly PlaceholderRowVm[],
    axis: AxisVm,
): OptionFragment {
    const series = placeholders.map((placeholder) =>
        buildSkeletonSeries(placeholder, axis),
    );

    const fragment: Partial<EChartsOption> = {
        series,
    };

    return {
        key: 'bars',
        fragment,
    };
}

/**
 * Builds one skeleton placeholder series. `renderItem` closure-captures
 * the row's `startMs`, the axis `mountNowMs` and `endMs`, and the row
 * index, then delegates pixel geometry to `computeBarRect` and the
 * growth animation to `buildBarRightEdgeAnimation`.
 *
 * The rect is assembled into a typed `KeyframeAnimatedRect` first so the
 * augmented fields stay type-checked; the final `as unknown as` cast is
 * the single, narrow type-system escape needed to satisfy ECharts'
 * upstream return signature.
 *
 * @param placeholder - The row to paint.
 * @param axis        - Axis view-model slice anchoring the growth animation.
 * @returns A custom series option drawing a single animated rect.
 */
function buildSkeletonSeries(
    placeholder: PlaceholderRowVm,
    axis: AxisVm,
): CustomSeriesOption {
    const { startMs, rowIndex } = placeholder;
    const { mountNowMs, endMs: axisEndMs } = axis;
    const fadeInDelayMs = rowIndex * SKELETON_FADE_IN_STAGGER_MS;
    const shimmerDelayMs =
        fadeInDelayMs +
        SKELETON_FADE_IN_DURATION_MS +
        rowIndex * SKELETON_ROW_PHASE_OFFSET_MS;

    return {
        ...createBarSeriesShell(startMs, axisEndMs, rowIndex),
        silent: true,
        renderItem: (_params, api) => {
            const shape = computeBarRect(api, startMs, mountNowMs, rowIndex);
            const growth = buildBarRightEdgeAnimation(
                api,
                startMs,
                mountNowMs,
                axisEndMs,
                rowIndex,
            );

            const rect: KeyframeAnimatedRect = {
                type: 'rect',
                shape,
                style: { fill: SKELETON_FILL_COLOR, opacity: 0 },
                keyframeAnimation: [
                    {
                        duration: SKELETON_FADE_IN_DURATION_MS,
                        loop: false,
                        delay: fadeInDelayMs,
                        easing: SKELETON_FADE_IN_EASING,
                        keyframes: [
                            { percent: 0, style: { opacity: 0 } },
                            { percent: 1, style: { opacity: SKELETON_OPACITY_MIN } },
                        ],
                    },
                    {
                        duration: SKELETON_KEYFRAME_DURATION_MS,
                        loop: true,
                        delay: shimmerDelayMs,
                        keyframes: [
                            {
                                percent: 0,
                                easing: SKELETON_SHIMMER_EASING,
                                style: { opacity: SKELETON_OPACITY_MIN },
                            },
                            {
                                percent: 0.5,
                                easing: SKELETON_SHIMMER_EASING,
                                style: { opacity: SKELETON_OPACITY_MAX },
                            },
                            {
                                percent: 1,
                                easing: SKELETON_SHIMMER_EASING,
                                style: { opacity: SKELETON_OPACITY_MIN },
                            },
                        ],
                    },
                    growth,
                ],
            };

            return rect as unknown as CustomRenderItemReturn;
        },
    };
}
