/**
 * Skeleton view-model configuration.
 *
 *  - `SKELETON_ROW_COUNT`             — number of placeholder rows painted.
 *  - `SYNTHETIC_AXIS_WINDOW_MS`       — half-width of the synthetic time
 *                                       window used when no instance
 *                                       prefetch has arrived yet (axis
 *                                       renders [now - w, now + w]).
 *  - `SKELETON_MIN_BAR_DURATION_MS` /
 *    `SKELETON_MAX_BAR_DURATION_MS`   — bounds for the seeded random
 *                                       target widths of placeholder bars.
 */
export const SKELETON_ROW_COUNT = 8;
export const SYNTHETIC_AXIS_WINDOW_MS = 30 * 60 * 1000;
export const SKELETON_MIN_BAR_DURATION_MS = 2 * 60 * 1000;
export const SKELETON_MAX_BAR_DURATION_MS = 20 * 60 * 1000;

/**
 * Drag-suppression queue configuration.
 *
 * `DRAG_RELEASE_DELAY_MS` is the timeout applied on `mouseup` before the
 * dragging flag flips back to `false` and the queued option is drained.
 * The delay differentiates a real drag-end from a click that fires
 * `mousedown`+`mouseup` back-to-back without movement.
 */
export const DRAG_RELEASE_DELAY_MS = 50;
