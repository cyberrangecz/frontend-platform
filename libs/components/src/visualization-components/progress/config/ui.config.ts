/**
 * Mode-agnostic UI configuration. Skeleton-only knobs live in
 * `skeleton.config.ts`.
 */

/**
 * Drag-suppression queue timeout applied on `mouseup` before the
 * dragging flag flips back to `false` and the queued option is drained.
 * Differentiates a real drag-end from a click that fires
 * `mousedown` + `mouseup` back-to-back without movement.
 */
export const DRAG_RELEASE_DELAY_MS = 50;

/**
 * Pixel height of a bar rectangle drawn inside `renderItem`. Shared by
 * live-mode bars and skeleton-mode placeholder bars so switching modes
 * does not visually resize rows.
 */
export const BAR_HEIGHT_PX = 24;
