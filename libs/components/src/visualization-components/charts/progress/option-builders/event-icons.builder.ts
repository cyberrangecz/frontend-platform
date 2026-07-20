import type { CustomSeriesOption, CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import { EVENT_ICON_CATALOG, EVENT_Z_ORDER } from '../config/event.config';
import { BAR_HEIGHT_PX } from '../config/ui.config';
import { BarVm } from '../types/bar.types';
import { EventKind, EventVm } from '../types/event.types';
import { BarKey } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import { OptionFragment } from '../types/option-fragment.types';
import { resolveBarHeightPx } from './bars/bar-geometry';

type RowGeometry = { isRunning: boolean; lagState: LagState };

/**
 * Icon size as a fraction of the row pixel height.
 * Applied to both the text glyph size and the background circle radius.
 */
const ICON_ROW_FRACTION = 0.6;

/**
 * Extra radial padding added to the icon size to size the background circle.
 */
const CIRCLE_PADDING = 2;

/**
 * Resting shadow on the background circle for subtle depth.
 */
const SHADOW_AT_REST = 'rgba(0,0,0,0.2)';

/**
 * Translates the per-bar event groups into ECharts `custom` series — one
 * series per `EventKind` present in the input.
 *
 * Z-order is applied at the series level via `EVENT_Z_ORDER` so events with
 * higher semantic priority (e.g. `SOLUTION_DISPLAYED`) are always drawn in
 * front of lower-priority ones when they share a timestamp.
 *
 * Each data point takes the form `[timestamp, rowIndex, EventVm & { barKey }]`
 * with `encode: { x: 0, y: 1 }` so ECharts maps the X extent and tooltip
 * hit area correctly. The payload at index 2 is what the tooltip's
 * discriminating formatter reads to branch on event vs bar — it checks
 * `data[2].kind` directly, so the shape must be flat (no envelope wrapper).
 *
 * All events are non-animating — engine-driven motion is reserved for bar
 * right-edge growth and the current-time marker.
 *
 * @param eventsByBar - Per-bar event groups keyed by `BarKey`.
 * @param bars - All bar view-models; used to derive per-row pixel height so
 *   icon size matches the actual bar height (running bars are taller).
 */
export function buildEventIconsFragment(
    eventsByBar: ReadonlyMap<BarKey, readonly EventVm[]>,
    bars: readonly BarVm[],
): OptionFragment {
    const rowGeometryByIndex = new Map<number, RowGeometry>();
    for (const bar of bars) {
        if (!rowGeometryByIndex.has(bar.rowIndex)) {
            rowGeometryByIndex.set(bar.rowIndex, { isRunning: bar.isRunning, lagState: bar.lagState });
        }
    }

    const byKind = groupEventsByKind(eventsByBar);

    const series: CustomSeriesOption[] = [];

    for (const [kind, events] of byKind) {
        const catalog = EVENT_ICON_CATALOG[kind];
        const zOrder = EVENT_Z_ORDER[kind];

        const data: [number, number, EventVm & { barKey: BarKey }][] = events.map((ev) => [
            ev.timestamp,
            ev.rowIndex,
            ev,
        ]);

        series.push({
            id: `event-icons-${kind}`,
            type: 'custom',
            z: zOrder,
            clip: true,
            silent: false,
            animation: false,
            encode: { x: 0, y: 1 },
            data,
            renderItem: buildRenderItem(catalog.icon, catalog.color, catalog.bgColor, rowGeometryByIndex),
        });
    }

    return { key: 'eventIcons', fragment: { series } };
}

/**
 * Produces a `renderItem` function bound to the icon/color/background values
 * from `EVENT_ICON_CATALOG` for one `EventKind`.
 *
 * The function is created once per kind per builder call — not per data point —
 * so the closure allocation is proportional to the number of distinct kinds
 * present in the input, not the total event count.
 *
 * @param icon - Material icon ligature string for the event kind.
 * @param iconColor - Foreground fill colour for the glyph.
 * @param bgColor - Background circle fill colour.
 * @param rowGeometryByIndex - Per-row geometry keyed by `rowIndex`; used to
 *   resolve the actual bar height so icon size tracks running/lagged bars.
 */
function buildRenderItem(
    icon: string,
    iconColor: string,
    bgColor: string,
    rowGeometryByIndex: ReadonlyMap<number, RowGeometry>,
): (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => CustomSeriesRenderItemReturn {
    return (_params, api) => {
        const timestamp = api.value(0) as number;
        const rowIndex = api.value(1) as number;

        const [cx, cy] = api.coord([timestamp, rowIndex]);
        const geometry = rowGeometryByIndex.get(rowIndex);
        const barHeightPx = geometry !== undefined
            ? resolveBarHeightPx(geometry.isRunning, geometry.lagState)
            : BAR_HEIGHT_PX;

        const iconSize = barHeightPx * ICON_ROW_FRACTION;
        const bgRadius = iconSize / 2 + CIRCLE_PADDING;

        return {
            type: 'group',
            silent: false,
            cursor: 'pointer',
            children: [
                {
                    type: 'circle',
                    shape: {
                        cx: cx ?? 0,
                        cy: cy ?? 0,
                        r: bgRadius,
                    },
                    style: {
                        fill: bgColor,
                        shadowBlur: 0,
                        shadowColor: SHADOW_AT_REST,
                        shadowOffsetX: 0,
                        shadowOffsetY: 1,
                    },
                    emphasis: {
                        style: {
                            shadowBlur: 12,
                            shadowColor: iconColor,
                            shadowOffsetX: 0,
                            shadowOffsetY: 0,
                        },
                    },
                },
                {
                    type: 'text',
                    style: {
                        text: icon,
                        x: cx ?? 0,
                        y: cy ?? 0,
                        fontSize: iconSize,
                        fontFamily: 'Material Icons',
                        fill: iconColor,
                        align: 'center',
                        verticalAlign: 'middle',
                    },
                    emphasis: {
                        style: {
                            fontSize: iconSize * 1.25,
                        },
                    },
                },
            ],
        };
    };
}

/**
 * Event kinds that are consumed by the run-caps builder and must not
 * render as standalone roundels. `TRAINING_RUN_RESUMED` retains its
 * roundel because no cap covers it.
 */
const RUN_CAP_CONSUMED_KINDS: ReadonlySet<EventKind> = new Set<EventKind>([
    'TRAINING_RUN_STARTED',
    'TRAINING_RUN_ENDED',
]);

/**
 * Partitions all events from the per-bar map into per-kind buckets.
 * Each `EventVm` is tagged with its `BarKey` by attaching it to the payload
 * during the iteration — the `EventVm` type itself does not carry `barKey`,
 * so the map key is threaded into the output at build time.
 *
 * Events whose kind is in `RUN_CAP_CONSUMED_KINDS` are excluded: their
 * metadata is consumed by the run-caps builder to anchor start/end cap
 * tooltips, and they must not also appear as roundels.
 */
function groupEventsByKind(
    eventsByBar: ReadonlyMap<BarKey, readonly EventVm[]>,
): Map<EventKind, (EventVm & { barKey: BarKey })[]> {
    const result = new Map<EventKind, (EventVm & { barKey: BarKey })[]>();

    for (const [barKey, events] of eventsByBar) {
        for (const ev of events) {
            if (RUN_CAP_CONSUMED_KINDS.has(ev.kind)) {
                continue;
            }
            let bucket = result.get(ev.kind);
            if (bucket === undefined) {
                bucket = [];
                result.set(ev.kind, bucket);
            }
            bucket.push({ ...ev, barKey });
        }
    }

    return result;
}
