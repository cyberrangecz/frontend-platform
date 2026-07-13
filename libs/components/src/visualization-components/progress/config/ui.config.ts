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
 * Top padding reserved for the lag-state legend ghost-series row and
 * the stepper-adjacent controls overlay above the plot area.
 * Must stay in sync with `GRID_TOP_PX` in grid.builder.ts.
 */
export const CHART_TOP_RESERVE_PX = 56;

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
 * Host width threshold below which the legend switches from horizontally
 * centred to right-aligned so it does not overlap the chart controls overlay.
 */
export const LEGEND_ALIGN_RIGHT_BELOW_PX = 1650;

/**
 * Stroke color of the current-time marker line and its clock label.
 * A near-black value that stands out against all chart series colors.
 * Canvas rendering cannot consume CSS custom properties, so the value is
 * resolved to a concrete hex here.
 *
 * Previously lived in `current-time-marker.builder.ts` as `MARKER_LINE_COLOR`;
 * moved here when the keyframe series was replaced by the imperative zrender
 * marker.
 */
export const CURRENT_TIME_MARKER_LINE_COLOR = '#0b0b0b';

/**
 * Stroke width of the current-time marker line in pixels.
 */
export const CURRENT_TIME_MARKER_LINE_WIDTH = 2;
