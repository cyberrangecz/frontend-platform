import { OptionFragment } from '../types/option-fragment.types';

/**
 * Returns the dataZoom option fragments — horizontal timeline slider plus
 * inside-wheel zoom, and vertical scrollbar (collapsed slider) plus
 * inside-wheel scroll.
 *
 * The scrollbar-from-slider trick lives here: a Y-axis `type: 'slider'`
 * with `width: 0`, `handleSize: 0`, `zoomLock: true`, `showDetail: false`,
 * `moveHandleSize: 12`, and `filterMode: 'empty'`. The `filterMode: 'empty'`
 * is mandatory — `filter` would collapse hidden category slots and break
 * `api.coord` for visible rows.
 *
 * `visibleRowCount` controls the `endValue - startValue + 1` of the
 * vertical scroll window. `preservedZoom` (when non-null) is the live
 * chart's current horizontal start/end percentage, threaded back through
 * this builder so a partial update does not reset the user's zoom.
 */
export interface DataZoomBuilderInput {
    readonly totalRowCount: number;
    readonly visibleRowCount: number;
    readonly preservedZoom: { readonly startPct: number; readonly endPct: number } | null;
    readonly preservedScrollStartIndex: number | null;
}

export function buildDataZoomFragment(
    _input: DataZoomBuilderInput,
): OptionFragment | null {
    throw new Error('not implemented');
}
