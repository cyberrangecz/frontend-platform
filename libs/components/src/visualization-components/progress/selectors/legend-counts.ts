import { BarWithLag } from '../types/bar.types';
import { LegendItemVm } from '../types/legend.types';

/**
 * Counts bars per lag-state value for the legend.
 *
 * Counts the population of the supplied bar list — the caller decides
 * whether to pass the full classified list (whole-population counts) or
 * the post-filter list (visible-population counts). Spec leaves the
 * choice as a code-phase tweak; the function itself is agnostic.
 *
 * Only the legend-filterable subset of lag states (`LAG_STATES_FILTERABLE`)
 * appears in the output, in canonical order.
 */
export function legendCounts(_bars: readonly BarWithLag[]): readonly LegendItemVm[] {
    throw new Error('not implemented');
}
