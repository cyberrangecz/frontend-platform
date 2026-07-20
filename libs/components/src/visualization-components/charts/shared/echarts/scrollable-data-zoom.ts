import { verticalScrollbarDataZoom } from '@crczp/echarts-utils';

import { ChartPalette } from './chart-palette';

/** Geometry and state for a vertically-scrolling category bar list. */
export interface ScrollableBarDataZoom {
    /** Total number of rows in the list; the scrollbar appears only when it exceeds the window. */
    readonly totalRows: number;
    /** Number of category rows visible at once before the list scrolls. */
    readonly visibleCount: number;
    /** Zero-based index of the topmost visible row, persisted across rebuilds. */
    readonly startIndex: number;
    /** Top inset of the scrollbar track, in pixels; align with the chart grid top. */
    readonly top: number;
    /** Bottom inset of the scrollbar track, in pixels; align with the chart grid bottom. */
    readonly bottom: number;
}

/**
 * Builds the `slider` dataZoom that turns a horizontal-bar category axis into a
 * scrollable list, styled to match the theme's webkit scrollbar. Thin adapter
 * over the shared {@link verticalScrollbarDataZoom} helper: it maps the resolved
 * {@link ChartPalette} to the helper's track/thumb colors and supplies the row
 * window from the persisted start index, so the window survives chart rebuilds
 * instead of snapping back to the top.
 *
 * Dragging the thumb scrolls the list; mouse-wheel scrolling is handled
 * separately by {@link EchartsChartBase.configureRowScroll}.
 *
 * @param palette  Resolved theme palette supplying the track and thumb colors.
 * @param geometry Row counts, persisted start index, and track insets.
 * @returns        The single-element `[slider]` dataZoom, or an empty array when the
 *                 list fits within the window (no scrollbar shown).
 */
export function scrollableBarDataZoom(palette: ChartPalette, geometry: ScrollableBarDataZoom): object[] {
    const { totalRows, visibleCount, startIndex, top, bottom } = geometry;
    if (totalRows <= visibleCount) return [];
    return [
        verticalScrollbarDataZoom(
            { track: palette.scrollTrack, thumb: palette.scrollThumb },
            { startIndex, endIndex: startIndex + visibleCount - 1, top, bottom },
        ),
    ];
}
