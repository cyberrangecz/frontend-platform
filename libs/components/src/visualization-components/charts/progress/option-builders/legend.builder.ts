import { CustomSeriesOption, EChartsOption, LegendComponentOption } from 'echarts';
import { PALETTE } from '../../shared';
import { LAG_STATE_COLORS, LAG_STATE_LABELS } from '../config/lag.config';
import { LAG_LEGEND_TOP_PX } from '../config/ui.config';
import { LAG_STATES_FILTERABLE, LagState } from '../types/lag-state.types';
import { OptionFragment } from '../types/option-fragment.types';
import { LegendItemVm } from '../types/view-model.types';
import { GRID_RIGHT_PX } from './grid.builder';

/** Stable component id of the lag-state legend, for id-merge on partial updates. */
export const LAG_LEGEND_ID = 'lag-legend' as const;

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
 * data slice with the active filter so both the full-option builder and the
 * partial-update builder receive a single coherent input.
 */
export interface LegendVm {
    readonly items: readonly LegendItemVm[];
    readonly excludedStates: ReadonlySet<LagState>;
    readonly hideLabels: boolean;
}

/**
 * Stable non-positional ECharts legend options. Position (`right`/`top`) is
 * applied in {@link buildLegendFragment}, pinning the lag-state legend to the
 * plot-area's right edge.
 */
const LEGEND_COMPONENT_BASE: Omit<Partial<LegendComponentOption>, 'left' | 'right' | 'top'> = {
    orient: 'horizontal',
    padding: [5, 10],
    itemGap: 20,
    itemWidth: 25,
    itemHeight: 14,
    textStyle: { fontSize: 12 },
    inactiveColor: PALETTE.gray.color,
    selectedMode: 'multiple',
    selector: false,
} as const;

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
 * The `selected` map reflects the active lag filter: a chip is selected
 * (its state passes through) unless that state is in `excludedStates`.
 * ngx-echarts applies the declarative option with `notMerge`, so this
 * fragment is the sole carrier of selection on the full-replace path; the
 * count-transition partial dispatch omits `selected` and relies on the
 * default id-merge to retain it.
 *
 * INACTIVE and INACTIVE_HIGHLIGHTED are visual-only states and do not
 * appear in the filterable set — they are absent from this fragment.
 *
 * @param legendVm - Presentation view-model carrying the per-state counts
 *                   and the excluded-state filter.
 * @returns A partial option with `series` (ghost series) and
 *          `legend` (component config) set. Never returns `null` — the
 *          legend is always present in live mode.
 */
export function buildLegendFragment(legendVm: LegendVm): OptionFragment {
    const ghostSeries = buildGhostSeries();
    const { data, formatter } = buildLegendComponentData(legendVm.items, legendVm.hideLabels);

    return {
        series: ghostSeries,
        legend: {
            ...LEGEND_COMPONENT_BASE,
            right: GRID_RIGHT_PX,
            top: LAG_LEGEND_TOP_PX,
            id: LAG_LEGEND_ID,
            data,
            formatter,
            selected: buildSelectedMap(legendVm.excludedStates),
        },
    };
}

/**
 * Builds the ECharts legend `selected` map keyed by chip label: a state is
 * selected when it is absent from the excluded set. Covers the full
 * filterable vocabulary so every chip carries an explicit selection state on
 * the full-replace path.
 *
 * @param excludedStates - Lag states the user has filtered out.
 * @returns Map from chip label to its selected flag.
 */
function buildSelectedMap(excludedStates: ReadonlySet<LagState>): Record<string, boolean> {
    return Object.fromEntries(
        LAG_STATES_FILTERABLE.map((state) => [LAG_STATE_LABELS[state], !excludedStates.has(state)]),
    );
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
 * @param hideLabels - When true the formatter suppresses chip text, leaving the
 *                     colour swatch as the only visible chip content.
 * @returns `{ data, formatter }` ready to spread into the legend component.
 */
function buildLegendComponentData(legend: readonly LegendItemVm[], hideLabels: boolean): {
    data: string[];
    formatter: (name: string) => string;
} {
    const countByName = new Map<string, number>(
        legend.map((item) => [LAG_STATE_LABELS[item.state], item.count]),
    );

    const data = LAG_STATES_FILTERABLE.map((state) => LAG_STATE_LABELS[state]);
    const formatter = (name: string): string =>
        hideLabels ? '' : `${name} (${countByName.get(name) ?? 0})`;

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
 *
 * @param legend - Refreshed legend slice with per-state counts.
 * @param hideLabels - Current label-visibility decision, re-applied so a
 *                     count-transition dispatch does not restore hidden text.
 */
export function buildLegendPartialOption(
    legend: readonly LegendItemVm[],
    hideLabels: boolean,
): Partial<EChartsOption> {
    const ghostSeries = buildGhostSeries();
    const { data, formatter } = buildLegendComponentData(legend, hideLabels);
    return {
        series: ghostSeries,
        legend: {
            ...LEGEND_COMPONENT_BASE,
            id: LAG_LEGEND_ID,
            data,
            formatter,
        },
    };
}
