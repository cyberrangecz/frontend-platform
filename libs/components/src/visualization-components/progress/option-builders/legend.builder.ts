import { LegendItemVm } from '../types/legend.types';
import { OptionFragment } from '../types/option-fragment.types';

/**
 * Translates the legend slice into the ghost-series option fragment plus
 * the legend component option.
 *
 * The ghost-series-with-empty-data trick lives here: one
 * `type: 'custom'` series per filterable lag state, with `data: []` and
 * `renderItem: () => null`. Each is named with the lag state's label and
 * carries an `itemStyle.color` for the swatch. The legend component reads
 * these names + colors to render its entries.
 *
 * The selection state (which lag states are filtered) is driven by the
 * UI state service via the renderer's `legendselectchanged` handler, not
 * carried in this fragment.
 */
export function buildLegendFragment(
    _legend: readonly LegendItemVm[],
): OptionFragment | null {
    throw new Error('not implemented');
}
