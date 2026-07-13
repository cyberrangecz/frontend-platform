import { CustomSeriesOption, EChartsOption, LegendComponentOption } from 'echarts';
import { LAG_STATE_COLORS, LAG_STATE_LABELS } from '../config/lag.config';
import { LAG_STATES_FILTERABLE, LagState } from '../types/lag-state.types';
import { OptionFragment } from '../types/option-fragment.types';
import { LegendItemVm } from '../types/view-model.types';

/**
 * Stable series-id prefix for the legend ghost series. The renderer dispatches
 * a partial `setOption` payload — keyed by this id — whenever a bar's lag
 * state crosses a threshold. The partial dispatch updates only the chip
 * counts and never touches the bars series, so running `keyframeAnimation`
 * entries on the bars stay alive without restart.
 */
const LEGEND_SERIES_ID_PREFIX = 'legend-ghost' as const;

/**
 * Builds the stable id for a ghost-series by lag state. Consumed by the
 * legend builder when emitting the initial option and by the renderer when
 * dispatching partial legend updates so the id-merge pairs the right series.
 */
export function legendGhostSeriesId(state: LagState): string {
    return `${LEGEND_SERIES_ID_PREFIX}-${state}`;
}

/**
 * Presentation-layer view-model for the legend component. Bundles the
 * data slice with the layout decision so both the full-option builder and
 * the partial-update builder receive a single coherent input.
 *
 * `alignRight` is resolved by the renderer from the current host width;
 * it is not part of the upstream `LiveViewModel` because it is a purely
 * presentational concern derived at render time.
 */
export interface LegendVm {
    readonly items: readonly LegendItemVm[];
    readonly alignRight: boolean;
}

/**
 * Stable non-positional ECharts legend options shared across all alignment
 * variants. Position (`left`/`right`/`top`) is applied dynamically via
 * `buildLegendPosition`.
 */
const LEGEND_COMPONENT_BASE: Omit<Partial<LegendComponentOption>, 'left' | 'right' | 'top'> = {
    orient: 'horizontal',
    padding: [5, 10],
    itemGap: 20,
    itemWidth: 25,
    itemHeight: 14,
    textStyle: { fontSize: 12 },
    selectedMode: 'multiple',
    selector: false,
} as const;

function buildLegendPosition(alignRight: boolean): Partial<LegendComponentOption> {
    return alignRight ? { right: 10, top: 20 } : { left: 'center', top: 20 };
}

/**
 * Translates the legend slice into the ghost-series option fragment plus
 * the legend component option.
 *
 * Ghost-series trick (tricks.md §2): one `type: 'custom'` series per
 * filterable lag state with `data: []` and a no-op `renderItem`. ECharts
 * legend reads the `name` and `itemStyle.color` from these series to
 * render each swatch entry. Because `data` is empty, `renderItem` is
 * never invoked and nothing is drawn.
 *
 * Series names are the bare `LAG_STATE_LABELS[state]` values (e.g.
 * `"On Track"`) — they never carry counts. Counts are rendered by a
 * `legend.formatter` closure that is rebuilt on every call with the
 * current counts from the supplied `legend` slice. This keeps ECharts'
 * internal `selected` map stable across count transitions because the map
 * is keyed by series name; renaming the series on every count change
 * would silently discard the user's deselection state.
 *
 * The `selected` map is intentionally absent from this fragment — it is
 * managed exclusively by the renderer in response to `legendselectchanged`
 * events; including it here would overwrite the user's current filter
 * state on every partial update.
 *
 * INACTIVE and INACTIVE_HIGHLIGHTED are visual-only states and do not
 * appear in the filterable set — they are absent from this fragment.
 *
 * @param legendVm - Presentation view-model carrying the per-state counts
 *                   and the alignment decision for the current host width.
 * @returns A fragment keyed `'legend'` with `series` (ghost series) and
 *          `legend` (component config) set. Never returns `null` — the
 *          legend is always present in live mode.
 */
export function buildLegendFragment(legendVm: LegendVm): OptionFragment {
    const ghostSeries = buildGhostSeries();
    const { data, formatter } = buildLegendComponentData(legendVm.items);

    const fragment: Partial<EChartsOption> = {
        series: ghostSeries,
        legend: {
            ...LEGEND_COMPONENT_BASE,
            ...buildLegendPosition(legendVm.alignRight),
            data,
            formatter,
        },
    };

    return {
        key: 'legend',
        fragment,
    };
}

/**
 * Builds one ghost `type: 'custom'` series per filterable lag state.
 *
 * Iteration is driven by `LAG_STATES_FILTERABLE` to guarantee a stable,
 * canonical ordering. Series names are the bare `LAG_STATE_LABELS[state]`
 * values — they never carry counts so ECharts' internal `selected` map
 * remains stable across count transitions. Counts are surfaced exclusively
 * via the `legend.formatter` closure built by `buildLegendComponentData`.
 *
 * @returns Array of ghost custom series in `LAG_STATES_FILTERABLE` order.
 */
function buildGhostSeries(): CustomSeriesOption[] {
    return LAG_STATES_FILTERABLE.map((state) => {
        const series: CustomSeriesOption = {
            id: legendGhostSeriesId(state),
            type: 'custom',
            name: LAG_STATE_LABELS[state],
            data: [],
            itemStyle: { color: LAG_STATE_COLORS[state] },
            renderItem: () => null,
            silent: true,
            animation: false,
        };

        return series;
    });
}

/**
 * Derives the stable `data` array and a count-aware `formatter` closure
 * for the ECharts `legend` component.
 *
 * `data` contains the bare label strings in `LAG_STATES_FILTERABLE` order
 * — the same values used as `series.name` by `buildGhostSeries`. The
 * `formatter` closure captures the current count for each label from the
 * supplied `legend` slice and renders chip text as `"${label} (${count})"`.
 * States absent from the slice fall back to count `0`.
 *
 * Rebuilding the formatter on every call (rather than caching it) is cheap
 * and ensures stale closure values never leak across partial dispatches.
 *
 * @param legend - Current legend slice with per-state counts.
 * @returns `{ data, formatter }` ready to spread into the legend component.
 */
function buildLegendComponentData(legend: readonly LegendItemVm[]): {
    data: string[];
    formatter: (name: string) => string;
} {
    const countByName = new Map<string, number>(
        legend.map((item) => [LAG_STATE_LABELS[item.state], item.count]),
    );

    const data = LAG_STATES_FILTERABLE.map((state) => LAG_STATE_LABELS[state]);
    const formatter = (name: string): string => `${name} (${countByName.get(name) ?? 0})`;

    return { data, formatter };
}

/**
 * Builds the partial option payload the renderer dispatches when the legend
 * needs to refresh without disturbing the bars series.
 *
 * The payload carries:
 *   - The legend ghost series array with stable `id`s — ECharts merges by id,
 *     so only these series are touched. Series names are bare labels so
 *     ECharts' `selected` map is unaffected by count changes.
 *   - The `legend` component option with a refreshed `formatter` closure
 *     that renders the updated counts next to each chip label.
 *
 * Position (`left`/`right`) is intentionally omitted — ECharts' default
 * id-merge retains the last full-option position, so omitting it here
 * prevents count-transition partial dispatches from resetting alignment.
 *
 * The payload MUST be dispatched without `replaceMerge: ['series']`. Default
 * id-merge keeps every non-mentioned series (the running bars) mounted and
 * their `keyframeAnimation` entries running.
 */
export function buildLegendPartialOption(
    legend: readonly LegendItemVm[],
): Partial<EChartsOption> {
    const ghostSeries = buildGhostSeries();
    const { data, formatter } = buildLegendComponentData(legend);
    return {
        series: ghostSeries,
        legend: {
            ...LEGEND_COMPONENT_BASE,
            data,
            formatter,
        },
    };
}
