/**
 * UI configuration for the progress visualization.
 */

/**
 * Drag-suppression queue timeout applied on `mouseup` before the
 * dragging flag flips back to `false` and the queued option is drained.
 * Differentiates a real drag-end from a click that fires
 * `mousedown` + `mouseup` back-to-back without movement.
 */
export const DRAG_RELEASE_DELAY_MS = 50;

/**
 * Pixel height of a bar rectangle drawn inside `renderItem`.
 */
export const BAR_HEIGHT_PX = 24;

export const ROW_PADDING_PX = 4;

export const ROW_HEIGHT_PX = BAR_HEIGHT_PX + ROW_PADDING_PX * 2;

/**
 * Most trainee rows shown at once. Instances with more trainees expose the
 * remainder through the vertical scroll (y-axis dataZoom) rather than growing
 * the chart.
 */
export const VISIBLE_ROW_COUNT = 20;

/**
 * Fewest trainee rows the chart lays out. Instances below this count pad the
 * Y axis with empty rows, so the plot area keeps a workable height and the
 * bars stay clear of the legend above and the timeline slider below.
 */
export const MIN_VISIBLE_ROW_COUNT = 3;

/**
 * Top padding reserved for the two stacked legend rows (event-type above
 * lag-state) above the plot area. Must stay in sync with `GRID_TOP_PX` in
 * grid.builder.ts and leave room for both {@link EVENT_LEGEND_TOP_PX} and
 * {@link LAG_LEGEND_TOP_PX}.
 */
export const CHART_TOP_RESERVE_PX = 84;

/**
 * Top offset of the event-type legend row, the upper of the two stacked
 * legends.
 */
export const EVENT_LEGEND_TOP_PX = 14;

/**
 * Top offset of the lag-state legend row, sitting beneath the event-type
 * legend.
 */
export const LAG_LEGEND_TOP_PX = 46;

/**
 * Canvas width below which the legend chips drop their text labels and render
 * as swatch/icon only, so the stacked legends stay compact and clear of the
 * controls on a narrow chart.
 */
export const LEGEND_TEXT_HIDE_BELOW_PX = 1200;

/**
 * Bottom padding reserved for the horizontal timeline dataZoom slider
 * plus its label. Must stay in sync with `GRID_BOTTOM_PX` in grid.builder.ts.
 */
export const CHART_BOTTOM_RESERVE_PX = 64;

/**
 * Padding added on both sides of the data-derived axis window.
 * Provides visual breathing room so the first and last events are not
 * flush against the chart edges.
 */
export const AXIS_PADDING_MS = 10 * 60 * 1000;

/**
 * When the remaining right-padding (axisEnd − now) drops below this
 * threshold, the watchdog triggers a refresh so the axis end stays
 * comfortably ahead of the current time.
 */
export const AXIS_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Cadence of the watchdog interval that monitors the remaining
 * right-padding and triggers an axis refresh when needed.
 */
export const AXIS_WATCHDOG_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Stroke width of the current-time marker line in pixels.
 */
export const CURRENT_TIME_MARKER_LINE_WIDTH = 2;

/**
 * Font size in pixels of the current-time marker clock label.
 */
export const CURRENT_TIME_MARKER_FONT_SIZE_PX = 10;

/**
 * Z-order of the current-time marker line and clock label on the zrender layer.
 */
export const CURRENT_TIME_MARKER_Z = 10;
