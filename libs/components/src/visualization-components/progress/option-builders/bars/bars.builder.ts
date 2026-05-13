import { BarVm } from '../../types/bar.types';
import { OptionFragment } from '../../types/option-fragment.types';

/**
 * Translates the bar list into a collection of ECharts `custom` series.
 *
 * Per bar, emits a small group of series:
 *   1. the main rect (lag-state color, height multiplier by running/inactive)
 *   2. the half-pill marking the level-type icon at the left edge
 *   3. the diagonal-striped estimate overlay
 *
 * The encode-range-on-single-item-data trick is applied here: `data: [item]`
 * with `encode: { x: [0, 1], y: 2 }`. `renderItem` reads from the closure-
 * captured item via `api.coord([startMs, rowIndex])` and
 * `api.coord([endMs, rowIndex])`.
 *
 * The `clip` flag, the `silent` flag on non-interactive shapes, and per-
 * element animation flags live inside this builder.
 *
 * Skeleton mode is implemented in `skeleton-bars.builder.ts` — a sibling
 * file with no shared code, so the two modes evolve independently.
 */
export function buildBarsFragment(_bars: readonly BarVm[]): OptionFragment | null {
    throw new Error('not implemented');
}
