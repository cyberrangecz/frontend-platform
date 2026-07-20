import { CustomSeriesOption } from 'echarts';
import { LagState, LAG_STATES } from '../../types/lag-state.types';
import { BarVm, LagTransition } from '../../types/bar.types';
import { OptionFragment } from '../../types/option-fragment.types';
import { AxisVm } from '../../types/view-model.types';
import { AxisTimeScale } from '../axis-time-scale';
import { resolveEffectiveLagState } from './bars.builder';
import { createBarSeriesShell, computeBarRect, resolveBarHeightPx } from './bar-geometry';

/**
 * Minimum fractional distance between two adjacent `percent` values in a
 * step-wise keyframe pair. Mirrors the value from `bars.builder.ts` so
 * the opacity schedule stays frame-accurate with the color schedule.
 *
 * See `bars.builder.ts` `KEYFRAME_STEP_EPSILON` for a full explanation of
 * why this collapses the interpolation window to a single RAF tick.
 */
const KEYFRAME_STEP_EPSILON = 1e-6;

/**
 * Per-element z2 applied to every stripe rect. Paints above the bar body
 * rect (z2 0) and below the half-pill cap and its icon glyph (z2 10/11),
 * all within the shared bar series z so the ordering is stable across every
 * bar and estimate series in the same zlevel.
 */
const ESTIMATE_OVERLAY_Z2 = 5;

/**
 * Resolves the effective lag state for an estimate overlay. Routes the
 * estimate-specific base state — the bar's classified `lagState` while running,
 * `INACTIVE` once complete — through {@link resolveEffectiveLagState}, so the
 * highlight override is applied identically to the bar series.
 *
 * @param bar - The bar the estimate overlay belongs to.
 * @returns The lag state token driving the stripe colour.
 */
function resolveEstimateState(bar: BarVm): LagState {
    return resolveEffectiveLagState(bar, bar.isRunning ? bar.lagState : 'INACTIVE');
}

/**
 * Darker-variant stripe colors keyed by LagState.
 *
 * Each value is the darker/saturated counterpart of the corresponding entry
 * in config/lag.config.ts LAG_STATE_COLORS, chosen so the stripe remains
 * visible over the base bar fill. The palette is declared as a standalone
 * constant: the darkening mapping is subjective and the values were fixed
 * during the visual pass. LAG_STATE_COLORS is not imported to avoid a
 * runtime dependency whose sole use would be documentation.
 *
 * Exported for unit tests that verify full LagState coverage.
 */
export const ESTIMATE_STRIPE_COLORS: Readonly<Record<LagState, string>> = {
    OK: '#225e00',
    WARNING: '#bc5e00',
    LATE: '#aa0000',
    ABANDONED: '#08102b',
    COMPLETED: '#0c1e8c',
    INACTIVE: '#4d4a4a',
    INACTIVE_HIGHLIGHTED: '#4a4a4a',
} as const;

/**
 * Builds one 8×8 stripe tile canvas for the given stroke color.
 *
 * Three stroked segments form a seamless diagonal-stripe when ECharts tiles
 * the canvas with `repeat:'repeat'`. The main diagonal covers the body; two
 * corner seams close the tile edge so no gap appears at repeat boundaries.
 *
 * Called once per lag state at module load — never per render.
 * Reference technique: tricks.md §5.
 */
function buildStripePatternCanvas(strokeColor: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;

    // '2d' context is universally available in browser and jsdom environments.
    const ctx = canvas.getContext('2d')!;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';

    // Main diagonal — extends one pixel past all four corners so line-cap
    // artefacts stay outside the tile boundary.
    ctx.beginPath();
    ctx.moveTo(-1, -1);
    ctx.lineTo(9, 9);
    ctx.stroke();

    // Top-right corner seam — continues the stripe at the horizontal repeat boundary.
    ctx.beginPath();
    ctx.moveTo(7, -1);
    ctx.lineTo(9, 1);
    ctx.stroke();

    // Bottom-left corner seam — same continuity guarantee on the opposite edge.
    ctx.beginPath();
    ctx.moveTo(-1, 7);
    ctx.lineTo(1, 9);
    ctx.stroke();

    return canvas;
}

/**
 * Pre-built stripe-pattern canvases, one per LagState, keyed by the
 * lag-state token. Populated once at module load; never mutated after
 * initialisation.
 *
 * Keyed by LagState (not by raw color string) because the bars builder has
 * a LagState in hand after resolveEstimateState — it does not need to
 * look up the intermediate color string.
 *
 * The map is complete for every member of LAG_STATES, so a post-narrowing
 * assertion is safe at any lookup site that is already guarded by a LagState type.
 *
 * Memory: 7 × (8×8 × 4 B RGBA raster + DOM overhead) ≈ well under 100 KB.
 *
 * Exported so the bars builder and unit tests can inspect the cache directly.
 */
export const ESTIMATE_PATTERNS_MAP: ReadonlyMap<LagState, HTMLCanvasElement> =
    new Map<LagState, HTMLCanvasElement>(
        LAG_STATES.map((state) => [
            state,
            buildStripePatternCanvas(ESTIMATE_STRIPE_COLORS[state]),
        ]),
    );

/**
 * Returns the cached stripe-pattern canvas for the given lag state.
 *
 * @param state - The resolved lag-state token (after resolveEstimateState).
 * @returns The pre-built HTMLCanvasElement tile.
 * @throws When the cache is missing the requested state (invariant violation).
 */
export function getEstimatePatternCanvas(state: LagState): HTMLCanvasElement {
    const canvas = ESTIMATE_PATTERNS_MAP.get(state);
    if (canvas === undefined) {
        throw new Error(
            `[estimate-overlay] No stripe pattern cached for lag state "${state}". ` +
            `All LagState members must have a pre-built tile.`,
        );
    }
    return canvas;
}

/**
 * One keyframe of a zrender `style`-targeting animation for opacity.
 * The optional per-keyframe `easing` selects the curve applied from the
 * previous keyframe to this one.
 */
interface EstimateOpacityKeyframe {
    readonly percent: number;
    readonly easing?: string;
    readonly style: { readonly opacity: number };
}

/**
 * One entry in a zrender element's `keyframeAnimation` array targeting
 * `style.opacity`. Each stripe rect carries at most one entry.
 *
 * `duration` and `delay` anchor match those used by `buildBarColorAnimation`
 * in `bars.builder.ts` so both animations are in lock-step.
 */
interface EstimateOpacityAnimation {
    readonly duration: number;
    readonly loop: boolean;
    readonly delay: number;
    readonly easing?: string;
    readonly keyframes: readonly EstimateOpacityKeyframe[];
}

/**
 * Stripe pattern fill shape reused in each stacked rect.
 */
interface StripePatternFill {
    readonly type: 'pattern';
    readonly image: HTMLCanvasElement;
    readonly repeat: 'repeat';
}

/**
 * One stacked stripe rect shape returned from `renderItem`. When
 * `keyframeAnimation` is present the rect participates in the opacity
 * schedule; otherwise it is a static visible or invisible rect.
 */
interface StripeRectElement {
    readonly type: 'rect';
    readonly shape: {
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
    };
    readonly style: {
        readonly fill: StripePatternFill;
        readonly opacity: number;
    };
    readonly z2: number;
    readonly silent: true;
    readonly keyframeAnimation?: readonly EstimateOpacityAnimation[];
}

/**
 * Group returned when the overlay is animated (Option A). Contains one
 * stacked stripe rect per unique lag state in the bar's schedule.
 */
interface StripeGroupElement {
    readonly type: 'group';
    readonly children: readonly StripeRectElement[];
}

/**
 * Alias for the upstream `renderItem` return type.
 */
type CustomRenderItemReturn = ReturnType<NonNullable<CustomSeriesOption['renderItem']>>;

/**
 * Builds the opacity-schedule keyframe animation for one stacked stripe rect.
 *
 * The rect whose `ownState` is active (i.e. the current lag state in the
 * schedule) should be opaque (`opacity: 1`) and all others should be
 * transparent (`opacity: 0`).
 *
 * Each state change is represented as a step-wise pair of keyframes using
 * `KEYFRAME_STEP_EPSILON` to collapse the interpolation window — identical
 * to the technique in `buildBarColorAnimation` in `bars.builder.ts`.
 *
 * A `percent: 0` keyframe opens with `opacity: 1` when `ownState` matches
 * `snapshotLagState`, or `opacity: 0` otherwise. A terminal `percent: 1`
 * keyframe is always appended.
 *
 * @param ownState         - The lag state this rect visualises.
 * @param snapshotLagState - The bar's lag state at mount time.
 * @param transitions      - Future state crossings, ordered ascending by `atMs`.
 * @param mountNowMs       - Wall-clock timestamp at view-model assembly time.
 * @param axisEndMs        - Axis right edge; governs real-time duration.
 * @returns A single `EstimateOpacityAnimation` entry.
 */
function buildStripeOpacityAnimation(
    ownState: LagState,
    snapshotLagState: LagState,
    transitions: readonly LagTransition[],
    mountNowMs: number,
    axisEndMs: number,
): EstimateOpacityAnimation {
    const duration = Math.max(0, axisEndMs - mountNowMs);
    const keyframes: EstimateOpacityKeyframe[] = [
        {
            percent: 0,
            style: { opacity: snapshotLagState === ownState ? 1 : 0 },
        },
    ];

    let currentState = snapshotLagState;

    for (const transition of transitions) {
        const rawPercent = (transition.atMs - mountNowMs) / Math.max(1, duration);
        const atPercent = Math.max(0, Math.min(1, rawPercent));
        const beforePercent = Math.max(0, atPercent - KEYFRAME_STEP_EPSILON);
        const previousIsOwn = currentState === ownState;
        const nextIsOwn = transition.toState === ownState;

        // Skip emitting a "before" keyframe when it coincides with percent 0
        // (avoids a duplicate at the opening keyframe).
        if (beforePercent > 0) {
            keyframes.push({
                percent: beforePercent,
                style: { opacity: previousIsOwn ? 1 : 0 },
            });
        }

        keyframes.push({
            percent: atPercent,
            style: { opacity: nextIsOwn ? 1 : 0 },
        });

        currentState = transition.toState;
    }

    const lastKeyframe = keyframes[keyframes.length - 1];
    if (lastKeyframe !== undefined && lastKeyframe.percent < 1) {
        keyframes.push({
            percent: 1,
            style: { opacity: currentState === ownState ? 1 : 0 },
        });
    }

    return {
        duration,
        loop: false,
        delay: 0,
        easing: 'linear',
        keyframes,
    };
}

/**
 * Builds the ECharts custom series for the estimate overlay of one bar.
 *
 * ### Static path (no animation)
 * Bars without future lag transitions (completed bars, no-estimate bars,
 * all crossings past `mountNowMs`) or bars overridden by `isOtherHighlighted`
 * receive a single static stripe rect whose fill is resolved from the
 * effective lag state snapshot. No `keyframeAnimation` is emitted.
 *
 * ### Animated path (Option A — stacked opacity rects)
 * Running bars with future lag transitions and no highlight override receive
 * one stacked stripe rect per unique lag state visited during the bar's
 * future schedule (snapshot ∪ `transitions.toState`). Each rect carries an
 * `EstimateOpacityAnimation` that drives its `style.opacity` between 1
 * (active) and 0 (inactive) at the correct wall-clock instant.
 *
 * The `duration` and `delay` on every opacity animation entry are anchored
 * to `axisEndMs - mountNowMs`, matching `buildBarColorAnimation` in
 * `bars.builder.ts` exactly. Both animations are therefore in lock-step.
 *
 * Option A is used (instead of animating `style.fill` with pattern objects)
 * because zrender's `whenWithKeys` interpolation is designed for numeric or
 * parseable-color properties. Pattern objects (`{type:'pattern', image:…}`)
 * have no defined blend, so the outcome of putting them in `style.fill`
 * keyframes is undefined. Stacked rects with opacity animation sidestep
 * the interpolation issue entirely.
 *
 * Returns `null` when `estimatedDurationMs` is absent or non-positive (no
 * estimate available; skip silently).
 *
 * @param bar  - The bar to overlay.
 * @param axis - Axis view-model slice anchoring the animation.
 * @param timeScale - Active axis time scale mapping absolute ms to axis space.
 * @returns A custom series option or null when the estimate is absent.
 */
function buildEstimateOverlaySeries(
    bar: BarVm,
    axis: AxisVm,
    timeScale: AxisTimeScale,
): CustomSeriesOption | null {
    const { estimatedDurationMs } = bar;

    if (estimatedDurationMs === null || estimatedDurationMs <= 0) {
        return null;
    }

    if (!bar.isRunning) {
        return null;
    }

    const estimateEndMs = bar.startedAt + estimatedDurationMs;
    const { mountNowMs, endMs: axisEndMs } = axis;

    const hasColorTransitions =
        !bar.isOtherHighlighted && bar.transitions.length > 0;

    if (hasColorTransitions) {
        // Option A: one stacked stripe rect per unique lag state in the schedule.
        // The snapshot state plus every toState visited by the transitions.
        const activeStates = new Set<LagState>([bar.lagState]);
        for (const t of bar.transitions) {
            activeStates.add(t.toState);
        }

        const height = resolveBarHeightPx(bar.isRunning, bar.lagState);

        return {
            id: `estimate-${bar.key}`,
            ...createBarSeriesShell(
                timeScale.toAxisValue(bar.startedAt, bar.rowIndex),
                timeScale.toAxisValue(estimateEndMs, bar.rowIndex),
                bar.rowIndex,
            ),
            silent: true,
            renderItem: (_params, api) => {
                const rect = computeBarRect(
                    api,
                    timeScale.toAxisValue(bar.startedAt, bar.rowIndex),
                    timeScale.toAxisValue(estimateEndMs, bar.rowIndex),
                    bar.rowIndex,
                    height,
                );
                const shapeProps = {
                    x: rect.x,
                    y: rect.y,
                    width: Math.max(rect.width, 2),
                    height: Math.max(rect.height, 2),
                };

                const children: StripeRectElement[] = [];

                for (const state of activeStates) {
                    const patternCanvas = getEstimatePatternCanvas(state);
                    const isSnapshotState = state === bar.lagState;

                    const opacityAnimation = buildStripeOpacityAnimation(
                        state,
                        bar.lagState,
                        bar.transitions,
                        mountNowMs,
                        axisEndMs,
                    );

                    children.push({
                        type: 'rect',
                        shape: shapeProps,
                        style: {
                            fill: {
                                type: 'pattern' as const,
                                image: patternCanvas,
                                repeat: 'repeat' as const,
                            },
                            opacity: isSnapshotState ? 1 : 0,
                        },
                        z2: ESTIMATE_OVERLAY_Z2,
                        silent: true,
                        keyframeAnimation: [opacityAnimation],
                    });
                }

                const group: StripeGroupElement = {
                    type: 'group',
                    children,
                };

                return group as unknown as CustomRenderItemReturn;
            },
        };
    }

    // Static path: single rect, no animation.
    const effectiveState = resolveEstimateState(bar);
    const patternCanvas = getEstimatePatternCanvas(effectiveState);
    const height = resolveBarHeightPx(bar.isRunning, effectiveState);

    return {
        id: `estimate-${bar.key}`,
        ...createBarSeriesShell(
            timeScale.toAxisValue(bar.startedAt, bar.rowIndex),
            timeScale.toAxisValue(estimateEndMs, bar.rowIndex),
            bar.rowIndex,
        ),
        silent: true,
        renderItem: (_params, api) => {
            const rect = computeBarRect(
                api,
                timeScale.toAxisValue(bar.startedAt, bar.rowIndex),
                timeScale.toAxisValue(estimateEndMs, bar.rowIndex),
                bar.rowIndex,
                height,
            );

            const stripeRect: StripeRectElement = {
                type: 'rect',
                shape: {
                    x: rect.x,
                    y: rect.y,
                    width: Math.max(rect.width, 2),
                    height: Math.max(rect.height, 2),
                },
                style: {
                    fill: {
                        type: 'pattern' as const,
                        image: patternCanvas,
                        repeat: 'repeat' as const,
                    },
                    opacity: 1,
                },
                z2: ESTIMATE_OVERLAY_Z2,
                silent: true,
            };

            return stripeRect as unknown as CustomRenderItemReturn;
        },
    };
}

/**
 * Builds one `OptionFragment` containing a custom series per bar that carries
 * an estimate overlay. Bars without `estimatedDurationMs` are silently skipped.
 *
 * Running bars with future lag transitions emit a group of stacked stripe
 * rects (Option A opacity animation). All other bars emit a single static
 * stripe rect. Both paths share the `'bars'` fragment key so estimate overlay
 * series are composited into the chart's series array alongside the live bar
 * series; the renderer treats all bar-layer series as a single replaceable
 * group.
 *
 * @param bars - Ordered list of bar view-model slices from the live VM.
 * @param axis - Axis view-model slice anchoring the animation.
 * @param timeScale - Active axis time scale mapping absolute ms to axis space.
 * @returns Fragment whose `series` array contains one entry per bar with a
 *          valid estimate, ready to merge into the ECharts option payload.
 */
export function buildEstimateOverlayFragment(
    bars: readonly BarVm[],
    axis: AxisVm,
    timeScale: AxisTimeScale,
): OptionFragment {
    const series: CustomSeriesOption[] = [];

    for (const bar of bars) {
        const overlaySeries = buildEstimateOverlaySeries(bar, axis, timeScale);
        if (overlaySeries !== null) {
            series.push(overlaySeries);
        }
    }

    return { series };
}
