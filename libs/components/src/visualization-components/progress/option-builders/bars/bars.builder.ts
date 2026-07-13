import { CustomSeriesOption, EChartsOption } from 'echarts';
import { Utils } from '@crczp/utils';
import { LAG_STATE_COLORS } from '../../config/lag.config';
import { BarVm } from '../../types/bar.types';
import { LagState } from '../../types/lag-state.types';
import { OptionFragment } from '../../types/option-fragment.types';
import { AxisVm } from '../../types/view-model.types';
import {
    BarRect,
    computeBarRect,
    createBarSeriesShell,
    resolveBarHeightPx,
} from './bar-geometry';

/**
 * Half-pill icon glyph size as a fraction of the rect's pixel height.
 * Keeps the icon proportional to the lag-state height scale so the pill
 * stays visually anchored inside the rect on both active and inactive
 * rows.
 */
const PILL_ICON_HEIGHT_FRACTION = 0.65;

/**
 * Half-pill background fill colour — neutral light tint that sits on top
 * of every lag-state colour without competing for attention.
 */
const PILL_BACKGROUND_COLOR = 'rgba(243,243,243,0.75)';

/**
 * Half-pill glyph foreground colour — muted purple-gray per visuals.md
 * §Level Type Pill. Distinct from event-icon colours so the level marker
 * never reads as an event.
 */
const PILL_FOREGROUND_COLOR = '#8989b1';

/**
 * Horizontal pixel nudge applied to the half-pill glyph so its optical
 * centre lands inside the curved cap rather than on the rectangle seam.
 * Sourced from the legacy renderer's tuned offset.
 */
const PILL_ICON_HORIZONTAL_NUDGE_PX = 2;

/**
 * Y-radius bump applied to the half-pill arc per tricks.md §6 — the
 * minimum delta that closes the visible seam on the curved cap when the
 * X and Y arc radii are otherwise equal.
 */
const HALF_PILL_ARC_Y_RADIUS_BUMP_PX = 0.5;

/**
 * Per-element z2 for the half-pill path. Paints above the estimate overlay
 * stripes (z2 5) within the shared bar series z.
 */
const PILL_Z2 = 10;

/**
 * Per-element z2 for the level-type icon glyph. One step above the pill
 * path (z2 10) so the glyph is never obscured by its own background cap.
 */
const PILL_ICON_Z2 = 11;

/**
 * Tooltip payload carried on a bar's data tuple at slot `data[3]`.
 *
 * Consumed by the tooltip formatter (WP6) via `params.data[3]`. The
 * `kind: 'bar'` literal discriminates bar vs event tuples so WP6 can
 * branch with `data[3].kind === 'bar'` without an array-shape check.
 *
 * Field naming follows the canonical WP6 contract:
 *   - `startMs`  — bar start timestamp (epoch ms).
 *   - `endMs`    — effective end timestamp (epoch ms); equals `mountNowMs`
 *                  (per-poll elapsed) for running bars, `effectiveEnd` for
 *                  completed bars.
 *
 * Kept structural (no class) so the tooltip formatter consumes a plain record.
 */
export interface BarTooltipPayload {
    readonly kind: 'bar';
    readonly lagState: LagState;
    readonly levelTitle: string;
    readonly levelType: BarVm['levelType'];
    readonly traineeId: BarVm['traineeId'];
    readonly traineeDisplayName: BarVm['traineeDisplayName'];
    readonly startMs: number;
    readonly endMs: number;
    readonly estimatedDurationMs: number | null;
    readonly scoreOnCompletion: number | null;
    readonly isRunning: boolean;
    readonly isHighlighted: boolean;
    readonly isOtherHighlighted: boolean;
    readonly isTraineeFavourited: boolean;
}

/**
 * Bar's data tuple. The first three slots match the encode hint
 * (`{x:[0,1], y:2}`) per tricks.md §4; the fourth slot is the tooltip
 * payload read by the tooltip formatter via `params.data[3]`.
 * WP6 reads `data[3].kind === 'bar'` to discriminate bar vs event data.
 */
type BarDataTuple = readonly [
    startMs: number,
    seriesEndMs: number,
    rowIndex: number,
    payload: BarTooltipPayload,
];

/**
 * Strict shape of a zrender path element for the half-pill cap. Only
 * `pathData` is provided — fill/stroke are set via `style`.
 */
interface HalfPillPathElement {
    readonly type: 'path';
    readonly shape: { readonly pathData: string };
    readonly style: { readonly fill: string };
    readonly z2: number;
    readonly silent: true;
}

/**
 * Strict shape of the Material Icons text glyph rendered inside the
 * half-pill cap.
 */
interface PillIconTextElement {
    readonly type: 'text';
    readonly style: {
        readonly text: string;
        readonly x: number;
        readonly y: number;
        readonly fontSize: number;
        readonly fontFamily: 'Material Icons';
        readonly fill: string;
        readonly align: 'center';
        readonly verticalAlign: 'middle';
    };
    readonly z2: number;
    readonly silent: true;
}

/**
 * Strict shape of the rect child of the bar group. Completed bars carry
 * a solid fill at final geometry. Running bars use a transparent hit-rect
 * (opacity 0 fill) so tooltip hit-testing is preserved while the
 * imperative zrender fill painted by the renderer shows through underneath.
 */
interface BarRectElement {
    readonly type: 'rect';
    readonly shape: BarRect;
    readonly style: { readonly fill: string; readonly opacity?: number };
}

/**
 * Strict shape of the group returned from `renderItem`. Group-level
 * interactivity is left enabled so tooltip hit-testing resolves against
 * the rect; the half-pill children opt out individually via `silent`.
 * The terminal `as unknown as` cast in the call site is the single,
 * narrow type-system escape needed to satisfy ECharts' upstream
 * `CustomSeriesRenderItemReturn` signature, which models per-element
 * fields more loosely than this strict local shape.
 */
interface BarGroupElement {
    readonly type: 'group';
    readonly children: readonly [
        BarRectElement,
        HalfPillPathElement,
        PillIconTextElement,
    ];
}

/**
 * Alias for the upstream `renderItem` return type. Centralised here so
 * the cast site stays one line.
 */
type CustomRenderItemReturn = ReturnType<NonNullable<CustomSeriesOption['renderItem']>>;

/**
 * Live-mode bars fragment. One `type: 'custom'` series per visible bar,
 * each drawing a group of three shapes: the lag-state rect, the
 * half-pill cap path, and the Material Icons level-type glyph.
 *
 * Running bars render a transparent hit-rect at mount-time geometry so
 * tooltip hit-testing is preserved. Their visible fill is painted
 * imperatively by the renderer's `updateRunningBarFills` subsystem and
 * survives dataZoom rescaling without resetting. Completed bars carry a
 * solid-fill rect at final geometry with no animation.
 *
 * @param bars - Per-bar slices from the live view-model.
 * @param axis - Axis view-model slice — carries `mountNowMs` (hit-rect
 *               right-edge anchor) and `endMs` (series extent).
 * @returns A fragment keyed `'bars'` with one custom series per bar.
 */
export function buildBarsFragment(
    bars: readonly BarVm[],
    axis: AxisVm,
): OptionFragment {
    const series = bars.map((bar) => buildLiveBarSeries(bar, axis));

    const fragment: Partial<EChartsOption> = {
        series,
    };

    return {
        key: 'bars',
        fragment,
    };
}

/**
 * Builds one live bar series. `renderItem` closure-captures the bar's
 * `startedAt`, `effectiveEnd`, `rowIndex`, lag-state colour, and the
 * axis mount-time snapshot, then delegates pixel geometry to
 * `computeBarRect`.
 *
 * The series carries a 4-tuple `data` row: the first three slots feed
 * the encode hint (axis extent + Y category); the fourth slot is the
 * tooltip payload read by the tooltip formatter via `params.data[3]`.
 *
 * Running bars render a transparent hit-rect (opacity 0) whose shape
 * spans from `startedAt` to `mountNowMs`. This rect is non-silent so
 * tooltip hit-testing fires normally. The visible fill is painted
 * imperatively by the renderer's `updateRunningBarFills` subsystem via a
 * zrender `Rect` driven by a timer and `convertToPixel` — that approach
 * survives dataZoom rescaling without resetting, unlike keyframe animation
 * which is rebaked on every `renderItem` call.
 *
 * Completed bars render a solid-fill rect at final geometry with no
 * animation — their width and colour are baked at paint time.
 *
 * Consumes `traineeDisplayName` from {@link BarVm}. Selector layer
 * (WP7-WP14) must populate this from the entity-resolved User.
 *
 * @param bar  - The bar to paint.
 * @param axis - Axis view-model slice anchoring the static mount-time extent.
 * @returns A custom series option drawing a single bar group.
 */
function buildLiveBarSeries(bar: BarVm, axis: AxisVm): CustomSeriesOption {
    const { startedAt: startMs, effectiveEnd, rowIndex, isRunning } = bar;
    const { mountNowMs, endMs: axisEndMs } = axis;
    const effectiveState = resolveEffectiveLagState(bar);
    const fillColor = LAG_STATE_COLORS[effectiveState];
    const barHeight = resolveBarHeightPx(bar.isRunning, effectiveState);
    const iconGlyph = Utils.LevelType.levelTypeToIcon(bar.levelType);
    const seriesEndMs = isRunning ? axisEndMs : effectiveEnd;
    const tooltipEndMs = isRunning ? mountNowMs : effectiveEnd;
    const tooltipPayload = buildBarTooltipPayload(bar, tooltipEndMs);
    const dataTuple: BarDataTuple = [startMs, seriesEndMs, rowIndex, tooltipPayload];

    return {
        ...createBarSeriesShell(startMs, seriesEndMs, rowIndex),
        id: `bar-${bar.key}`,
        data: [dataTuple],
        renderItem: (_params, api) => {
            const rectShape = isRunning
                ? computeBarRect(api, startMs, mountNowMs, rowIndex, barHeight)
                : computeBarRect(api, startMs, effectiveEnd, rowIndex, barHeight);

            const rect: BarRectElement = isRunning
                ? { type: 'rect', shape: rectShape, style: { fill: fillColor, opacity: 0 } }
                : { type: 'rect', shape: rectShape, style: { fill: fillColor } };

            const halfPill = buildHalfPillPath(rect.shape);
            const iconText = buildPillIconText(rect.shape, iconGlyph);

            const group: BarGroupElement = {
                type: 'group',
                children: [rect, halfPill, iconText],
            };

            return group as unknown as CustomRenderItemReturn;
        },
    };
}

/**
 * Returns `true` when the bar's lag state should be overridden to
 * `INACTIVE_HIGHLIGHTED` by a highlight rule regardless of its actual
 * classification. Two conditions trigger the override:
 *
 *   - `isOtherHighlighted`: another bar/trainee is highlighted and this
 *     bar belongs to a different trainee — it must dim unconditionally.
 *   - `isHighlighted && !isRunning`: this bar's trainee is the highlighted
 *     one and the bar is complete — it dims the completed bar to contrast
 *     against the running bar for the same trainee.
 *
 * Extracted so that both `resolveEffectiveLagState` (series renderItem)
 * and `resolveRunningBarEffectiveState` (imperative fill) share the same
 * predicate without duplication.
 */
function isLagStateOverridden(bar: BarVm): boolean {
    return bar.isOtherHighlighted || (bar.isHighlighted && !bar.isRunning);
}

/**
 * Resolves the bar's effective lag state by overlaying highlight flags
 * on top of the classified `lagState`. Centralised so colour and height
 * resolution stay in lock-step.
 */
function resolveEffectiveLagState(bar: BarVm): LagState {
    if (isLagStateOverridden(bar)) {
        return 'INACTIVE_HIGHLIGHTED';
    }
    return bar.lagState;
}

/**
 * Resolves the lag state of a running bar at an arbitrary wall-clock
 * instant by replaying the bar's future transition schedule against
 * `nowMs`. Returns the `toState` of the latest transition whose `atMs`
 * is at or before `nowMs`; falls back to `bar.lagState` when no
 * transition has fired yet. Transitions are assumed to be ordered
 * ascending by `atMs` (enforced by the selector layer).
 *
 * Exported for use by the renderer's imperative fill subsystem and for
 * unit testing.
 *
 * @param bar   - The running bar view-model.
 * @param nowMs - Current wall-clock timestamp (epoch ms).
 * @returns The bar's classified lag state at `nowMs`.
 */
export function lagStateAt(bar: BarVm, nowMs: number): LagState {
    let resolved: LagState = bar.lagState;
    for (const transition of bar.transitions) {
        if (transition.atMs <= nowMs) {
            resolved = transition.toState;
        } else {
            break;
        }
    }
    return resolved;
}

/**
 * Resolves the effective lag state for a running bar's imperative fill
 * at an arbitrary wall-clock instant. Applies the same highlight-override
 * rules as `resolveEffectiveLagState` but uses `lagStateAt` to pick the
 * current classified state rather than the mount-time snapshot.
 *
 * Exported for use by the renderer's `updateRunningBarFills` method.
 *
 * @param bar   - The running bar view-model.
 * @param nowMs - Current wall-clock timestamp (epoch ms).
 * @returns The effective lag state for the fill colour at `nowMs`.
 */
export function resolveRunningBarEffectiveState(bar: BarVm, nowMs: number): LagState {
    if (isLagStateOverridden(bar)) {
        return 'INACTIVE_HIGHLIGHTED';
    }
    return lagStateAt(bar, nowMs);
}

/**
 * Builds the half-pill path element that marks the level's left edge.
 * The path is `silent: true` so it does not steal tooltip events from
 * the rect underneath. The arc Y-radius is bumped by
 * {@link HALF_PILL_ARC_Y_RADIUS_BUMP_PX} per tricks.md §6 — the minimum
 * delta that closes the seam visible when the X and Y radii are equal.
 */
function buildHalfPillPath(rect: BarRect): HalfPillPathElement {
    const radius = rect.height / 2;
    const arcYRadius = radius + HALF_PILL_ARC_Y_RADIUS_BUMP_PX;
    const leftX = rect.x;
    const topY = rect.y;
    const bottomY = rect.y + rect.height;
    const arcRightX = leftX + radius;
    const pathData =
        `M ${leftX} ${topY}` +
        ` L ${arcRightX} ${topY}` +
        ` A ${radius} ${arcYRadius} 0 0 1 ${arcRightX} ${bottomY}` +
        ` L ${leftX} ${bottomY}` +
        ' Z';

    return {
        type: 'path',
        shape: { pathData },
        style: { fill: PILL_BACKGROUND_COLOR },
        z2: PILL_Z2,
        silent: true,
    };
}

/**
 * Builds the Material Icons glyph centred inside the half-pill cap. The
 * horizontal nudge keeps the glyph optically centred on the arc rather
 * than on the rectangle seam.
 */
function buildPillIconText(rect: BarRect, iconGlyph: string): PillIconTextElement {
    const radius = rect.height / 2;
    const centerX = rect.x + radius - PILL_ICON_HORIZONTAL_NUDGE_PX;
    const centerY = rect.y + radius;
    const fontSize = rect.height * PILL_ICON_HEIGHT_FRACTION;

    return {
        type: 'text',
        style: {
            text: iconGlyph,
            x: centerX,
            y: centerY,
            fontSize,
            fontFamily: 'Material Icons',
            fill: PILL_FOREGROUND_COLOR,
            align: 'center',
            verticalAlign: 'middle',
        },
        z2: PILL_ICON_Z2,
        silent: true,
    };
}

/**
 * Projects the bar VM into the tooltip payload shape consumed by the
 * tooltip formatter (WP6) via `params.data[3]`. The `kind: 'bar'` literal
 * is the discriminator WP6 reads as `data[3].kind === 'bar'`. Field
 * `endMs` equals `mountNowMs` for running bars (per-poll elapsed duration)
 * or `effectiveEnd` for completed bars.
 */
function buildBarTooltipPayload(bar: BarVm, endMs: number): BarTooltipPayload {
    return {
        kind: 'bar',
        lagState: bar.lagState,
        levelTitle: bar.levelTitle,
        levelType: bar.levelType,
        traineeId: bar.traineeId,
        traineeDisplayName: bar.traineeDisplayName,
        startMs: bar.startedAt,
        endMs,
        estimatedDurationMs: bar.estimatedDurationMs,
        scoreOnCompletion: bar.scoreOnCompletion,
        isRunning: bar.isRunning,
        isHighlighted: bar.isHighlighted,
        isOtherHighlighted: bar.isOtherHighlighted,
        isTraineeFavourited: bar.isTraineeFavourited,
    };
}
