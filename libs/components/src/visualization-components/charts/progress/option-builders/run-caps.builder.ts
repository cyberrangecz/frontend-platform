import type {
    CustomSeriesOption,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomSeriesRenderItemReturn,
} from 'echarts';
import {
    RUN_CAP_FILL_COLOR,
    RUN_END_CAP_GLYPH_COLOR,
    RUN_START_CAP_GLYPH_COLOR,
} from '../config/event.config';
import { BarVm } from '../types/bar.types';
import { EventVm } from '../types/event.types';
import { BarKey, TraineeId } from '../types/ids.types';
import { OptionFragment } from '../types/option-fragment.types';
import { deriveStartAnchors, RunAnchor, toRunAnchor } from '../selectors/start-anchors';
import { keepExtremumByKey } from '../selectors/keep-extremum-by-key';
import { AxisTimeScale } from './axis-time-scale';
import { resolveBarHeightPx } from './bars/bar-geometry';

/**
 * Material Icons ligature rendered inside the start cap (run began).
 */
export const RUN_START_CAP_GLYPH = 'login';

/**
 * Material Icons ligature rendered inside the end cap (run finished).
 */
export const RUN_END_CAP_GLYPH = 'logout';

/**
 * Glyph size as a fraction of the resolved bar-height pixel value —
 * mirrors `PILL_ICON_HEIGHT_FRACTION` from bars.builder.ts.
 */
const CAP_ICON_HEIGHT_FRACTION = 0.65;

/**
 * Horizontal pixel nudge applied to the glyph so its optical centre lands
 * inside the curved cap — mirrors `PILL_ICON_HORIZONTAL_NUDGE_PX` from
 * bars.builder.ts.
 */
const CAP_ICON_HORIZONTAL_NUDGE_PX = 2;

/**
 * Y-radius bump applied to the arc per the bars builder convention to close
 * the seam when X and Y arc radii are otherwise equal — mirrors
 * `HALF_PILL_ARC_Y_RADIUS_BUMP_PX` from bars.builder.ts.
 */
const CAP_ARC_Y_RADIUS_BUMP_PX = 0.5;

/**
 * Z-order for both cap series — below remaining event roundels (minimum z
 * is 10 for `TRAINING_RUN_RESUMED`) and above bars and the estimate overlay.
 */
const RUN_CAP_Z_ORDER = 8;

/**
 * Stable ECharts series id for the start-cap custom series. A fixed id
 * ensures `replaceMerge: ['series']` preserves the series across option
 * updates rather than treating it as a new anonymous series.
 */
const RUN_START_CAP_SERIES_ID = 'run-start-caps';

/**
 * Stable ECharts series id for the end-cap custom series.
 */
const RUN_END_CAP_SERIES_ID = 'run-end-caps';

/**
 * Data tuple for one cap point: `[anchorMs, rowIndex, EventVm & { barKey }]`.
 *
 * The tuple length of exactly 3 ensures the tooltip formatter's `isEventData`
 * discriminator (`length === 3 && typeof data[2].kind === 'string'`) routes
 * cap hits to `buildEventTooltipModel`, which reads `data[2]` as a flat `EventVm`.
 * Both `TRAINING_RUN_STARTED` and `TRAINING_RUN_ENDED` remain in
 * `EVENT_ICON_CATALOG` and `EVENT_KIND_LABELS`, so the tooltip renders their
 * label and icon correctly without any change to tooltip.builder.ts.
 */
type CapDataTuple = readonly [anchorMs: number, rowIndex: number, payload: EventVm & { barKey: BarKey }];

/**
 * Builds an ECharts option fragment containing two custom series that
 * render half-pill run-boundary caps:
 *
 * - `run-start-caps`: one cap per trainee anchored at the start of their
 *   earliest bar (`min startedAt`). Rendered for every trainee.
 * - `run-end-caps`: one cap per trainee anchored at the end of their latest
 *   bar (`max effectiveEnd`). Rendered only for finished trainees (none of
 *   their bars is currently running).
 *
 * Each cap's tooltip payload is sourced from the matching `TRAINING_RUN_STARTED`
 * or `TRAINING_RUN_ENDED` event in `eventsByBar`, falling back to a synthesized
 * `EventVm` carrying bar-derived timestamps when the event is absent.
 *
 * Both series are always present in the output — even when `data` is empty —
 * so `replaceMerge: ['series']` stability is maintained across option updates.
 *
 * @param bars - All bar view-models from the live view-model.
 * @param eventsByBar - Per-bar event groups keyed by `BarKey`.
 * @param timeScale - Active axis time scale mapping absolute ms to axis space.
 * @returns The `runCaps` option fragment containing both series.
 */
export function buildRunCapsFragment(
    bars: readonly BarVm[],
    eventsByBar: ReadonlyMap<BarKey, readonly EventVm[]>,
    timeScale: AxisTimeScale,
): OptionFragment {
    const startAnchors = deriveStartAnchors(bars);
    const endAnchors = deriveEndAnchors(bars);

    const startHeightByRow = buildHeightMap(startAnchors);
    const endHeightByRow = buildHeightMap(endAnchors);

    const startData = buildCapData(startAnchors, eventsByBar, 'TRAINING_RUN_STARTED', timeScale);
    const endData = buildCapData(endAnchors, eventsByBar, 'TRAINING_RUN_ENDED', timeScale);

    const startSeries: CustomSeriesOption = {
        id: RUN_START_CAP_SERIES_ID,
        type: 'custom',
        z: RUN_CAP_Z_ORDER,
        clip: true,
        silent: false,
        animation: false,
        encode: { x: 0, y: 1 },
        data: startData as unknown as CustomSeriesOption['data'],
        renderItem: buildCapRenderItem('start', RUN_CAP_FILL_COLOR, RUN_START_CAP_GLYPH_COLOR, RUN_START_CAP_GLYPH, startHeightByRow),
    };

    const endSeries: CustomSeriesOption = {
        id: RUN_END_CAP_SERIES_ID,
        type: 'custom',
        z: RUN_CAP_Z_ORDER,
        clip: true,
        silent: false,
        animation: false,
        encode: { x: 0, y: 1 },
        data: endData as unknown as CustomSeriesOption['data'],
        renderItem: buildCapRenderItem('end', RUN_CAP_FILL_COLOR, RUN_END_CAP_GLYPH_COLOR, RUN_END_CAP_GLYPH, endHeightByRow),
    };

    return { series: [startSeries, endSeries] };
}

/**
 * Derives one end anchor per finished trainee: the bar with the maximum
 * `effectiveEnd` across all bars belonging to that trainee, but only when
 * none of the trainee's bars is currently running.
 *
 * Trainees with at least one running bar are excluded because their run
 * has not yet ended and no end cap should be drawn.
 *
 * @param bars - All bar view-models.
 * @returns Map from `TraineeId` to its end-cap anchor (finished trainees only).
 */
function deriveEndAnchors(bars: readonly BarVm[]): Map<TraineeId, RunAnchor> {
    const runningTraineeIds = new Set<TraineeId>();
    for (const bar of bars) {
        if (bar.isRunning) {
            runningTraineeIds.add(bar.traineeId);
        }
    }

    const finishedBars = bars.filter((bar) => !runningTraineeIds.has(bar.traineeId));
    const latestByTrainee = keepExtremumByKey(
        finishedBars,
        (bar) => bar.traineeId,
        (candidate, incumbent) => candidate.effectiveEnd > incumbent.effectiveEnd,
    );

    const anchors = new Map<TraineeId, RunAnchor>();
    for (const [traineeId, bar] of latestByTrainee) {
        anchors.set(traineeId, toRunAnchor(bar, bar.effectiveEnd));
    }
    return anchors;
}

/**
 * Builds a map from row index to resolved bar height in pixels keyed by
 * the anchor bars in the supplied anchor map. Height is resolved from each
 * anchor's own `isRunning` and `lagState` fields, which correspond to the
 * actual anchor bar rather than any highlight-adjusted state.
 *
 * @param anchors - Anchor map whose values supply `isRunning` and `lagState`.
 * @returns Map from row index to pixel height.
 */
function buildHeightMap(anchors: ReadonlyMap<TraineeId, RunAnchor>): Map<number, number> {
    const heightByRow = new Map<number, number>();
    for (const anchor of anchors.values()) {
        if (!heightByRow.has(anchor.rowIndex)) {
            heightByRow.set(anchor.rowIndex, resolveBarHeightPx(anchor.isRunning, anchor.lagState));
        }
    }
    return heightByRow;
}

/**
 * Builds the data array for one cap series. For each anchor, finds the
 * matching event of `eventKind` in `eventsByBar[anchor.barKey]`. When the
 * event is absent, synthesizes a payload of the same shape with the
 * bar-derived anchor timestamp so the tooltip still renders.
 *
 * The synthesized payload carries no detail; the run-cap tooltip shows
 * only the kind header (`EVENT_KIND_LABELS` in tooltip.builder.ts) and time.
 *
 * The cap's X coordinate (tuple slot 0) is projected into axis space; the
 * tooltip payload (slot 2) keeps its absolute timestamps so the tooltip reads
 * wall-clock time regardless of axis mode.
 *
 * @param anchors - Anchor map produced by `deriveStartAnchors` or `deriveEndAnchors`.
 * @param eventsByBar - Per-bar event groups.
 * @param eventKind - The event kind literal to search for in each bar's event list.
 * @param timeScale - Active axis time scale mapping absolute ms to axis space.
 * @returns Data array ready to assign to a custom series.
 */
function buildCapData(
    anchors: ReadonlyMap<TraineeId, RunAnchor>,
    eventsByBar: ReadonlyMap<BarKey, readonly EventVm[]>,
    eventKind: 'TRAINING_RUN_STARTED' | 'TRAINING_RUN_ENDED',
    timeScale: AxisTimeScale,
): CapDataTuple[] {
    const data: CapDataTuple[] = [];

    for (const anchor of anchors.values()) {
        const events = eventsByBar.get(anchor.barKey);
        const matchingEvent = events?.find((ev) => ev.kind === eventKind);

        const payload: EventVm & { barKey: BarKey } =
            matchingEvent !== undefined
                ? { ...matchingEvent, barKey: anchor.barKey }
                : synthesizeCapPayload(eventKind, anchor);

        data.push([timeScale.toAxisValue(anchor.anchorMs, anchor.rowIndex), anchor.rowIndex, payload]);
    }

    return data;
}

/**
 * Synthesizes an `EventVm & { barKey }` payload for a cap when no matching
 * event is found in `eventsByBar`. The synthesized record matches the exact
 * shape the tooltip formatter expects so `buildEventTooltipModel` renders
 * without branching on payload origin.
 *
 * @param kind - The event kind to stamp on the synthesized payload.
 * @param anchor - The cap anchor supplying timestamps and identity.
 * @returns A synthesized event payload carrying bar-derived metadata.
 */
function synthesizeCapPayload(
    kind: 'TRAINING_RUN_STARTED' | 'TRAINING_RUN_ENDED',
    anchor: RunAnchor,
): EventVm & { barKey: BarKey } {
    return {
        kind,
        rowIndex: anchor.rowIndex,
        timestamp: anchor.anchorMs,
        detail: '',
        barKey: anchor.barKey,
    };
}

/**
 * Produces the `renderItem` function for one cap series. Each data point
 * renders as a group containing:
 *
 *   (a) A half-pill path element that extends outside the bar in the cap's
 *       direction — leftward (round on the left, flat on the right) for
 *       start caps; rightward (flat on the left, round on the right) for
 *       end caps.
 *   (b) A Material Icons glyph centred inside the curved portion of the pill.
 *
 * The group is non-silent so tooltip hit-testing resolves against the path —
 * unlike bars, where the rect is the hit target and the pill is silent.
 *
 * Pixel coordinates are resolved through `api.coord([anchorMs, rowIndex])`.
 * The bar-height pixel value is looked up from `heightByRow`, which was built
 * from the actual anchor bar for each row so the cap height matches the bar.
 *
 * @param direction - `'start'` extends left from the bar's left edge;
 *   `'end'` extends right from the bar's right edge.
 * @param fillColor - Background fill of the half-pill shape.
 * @param iconColor - Foreground fill of the Material Icons glyph.
 * @param iconGlyph - Material Icons ligature rendered inside the cap.
 * @param heightByRow - Pre-resolved pixel heights keyed by row index.
 */
function buildCapRenderItem(
    direction: 'start' | 'end',
    fillColor: string,
    iconColor: string,
    iconGlyph: string,
    heightByRow: ReadonlyMap<number, number>,
): (
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI,
) => CustomSeriesRenderItemReturn {
    return (_params, api) => {
        const anchorMs = api.value(0) as number;
        const rowIndex = api.value(1) as number;

        const coordPair = api.coord([anchorMs, rowIndex]);
        const cx = (coordPair[0] ?? 0) as number;
        const cy = (coordPair[1] ?? 0) as number;

        const barHeightPx = heightByRow.get(rowIndex) ?? resolveBarHeightPx(false, 'OK');
        const radius = barHeightPx / 2;
        const arcYRadius = radius + CAP_ARC_Y_RADIUS_BUMP_PX;
        const halfHeight = barHeightPx / 2;
        const topY = cy - halfHeight;
        const bottomY = cy + halfHeight;

        const pathData = buildCapPathData(direction, cx, topY, bottomY, radius, arcYRadius);

        const iconCenterX = computeIconCenterX(direction, cx, radius);
        const iconCenterY = cy;
        const iconSize = barHeightPx * CAP_ICON_HEIGHT_FRACTION;

        return {
            type: 'group',
            silent: false,
            cursor: 'pointer',
            children: [
                {
                    type: 'path',
                    shape: { pathData },
                    style: { fill: fillColor },
                    silent: false,
                },
                {
                    type: 'text',
                    style: {
                        text: iconGlyph,
                        x: iconCenterX,
                        y: iconCenterY,
                        fontSize: iconSize,
                        fontFamily: 'Material Icons' as const,
                        fill: iconColor,
                        align: 'center' as const,
                        verticalAlign: 'middle' as const,
                    },
                    silent: true,
                },
            ],
        } as unknown as CustomSeriesRenderItemReturn;
    };
}

/**
 * Computes the SVG path data string for one cap half-pill.
 *
 * Start cap geometry (round on left, flat on right abutting bar):
 *   Anchored at `cx` (the bar's left pixel), extends leftward by `radius`.
 *   Arc sweep is 0 (counter-clockwise) to curve the left side.
 *
 * End cap geometry (flat on left abutting bar, round on right):
 *   Anchored at `cx` (the bar's right pixel), extends rightward by `radius`.
 *   Arc sweep is 1 (clockwise) to curve the right side, matching the
 *   orientation of the level-type half-pill in bars.builder.ts.
 *
 * @param direction - `'start'` or `'end'` selects the mirrored geometry.
 * @param cx - X pixel of the bar edge where the cap abuts.
 * @param topY - Top pixel boundary of the bar row.
 * @param bottomY - Bottom pixel boundary of the bar row.
 * @param radius - Half the bar height — arc X radius.
 * @param arcYRadius - Arc Y radius (radius + `CAP_ARC_Y_RADIUS_BUMP_PX`).
 * @returns SVG path data string for the half-pill shape.
 */
function buildCapPathData(
    direction: 'start' | 'end',
    cx: number,
    topY: number,
    bottomY: number,
    radius: number,
    arcYRadius: number,
): string {
    if (direction === 'start') {
        // Flat edge on the right (at cx), arc on the left (at cx − radius).
        const arcX = cx - radius;
        return (
            `M ${cx} ${topY}` +
            ` L ${arcX} ${topY}` +
            ` A ${radius} ${arcYRadius} 0 0 0 ${arcX} ${bottomY}` +
            ` L ${cx} ${bottomY}` +
            ' Z'
        );
    }

    // direction === 'end': flat edge on the left (at cx), arc on the right (at cx + radius).
    const arcX = cx + radius;
    return (
        `M ${cx} ${topY}` +
        ` L ${arcX} ${topY}` +
        ` A ${radius} ${arcYRadius} 0 0 1 ${arcX} ${bottomY}` +
        ` L ${cx} ${bottomY}` +
        ' Z'
    );
}

/**
 * Computes the X pixel coordinate at which the icon glyph is optically
 * centred inside the curved portion of the cap.
 *
 * For a start cap the arc is on the left, so the centre sits left of `cx`.
 * For an end cap the arc is on the right, so the centre sits right of `cx`.
 * The horizontal nudge corrects optical centering on the arc seam, mirroring
 * `PILL_ICON_HORIZONTAL_NUDGE_PX` from bars.builder.ts.
 *
 * @param direction - `'start'` or `'end'`.
 * @param cx - X pixel of the bar edge where the cap abuts.
 * @param radius - Half the bar height.
 * @returns X pixel for the icon glyph's `align: 'center'` anchor.
 */
function computeIconCenterX(direction: 'start' | 'end', cx: number, radius: number): number {
    if (direction === 'start') {
        return cx - radius + CAP_ICON_HORIZONTAL_NUDGE_PX;
    }
    return cx + radius - CAP_ICON_HORIZONTAL_NUDGE_PX;
}
