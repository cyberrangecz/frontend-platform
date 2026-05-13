/**
 * Skeleton-mode configuration. Every constant in this file is consumed
 * exclusively by skeleton-only code paths — the skeleton view-model
 * assembler and the skeleton bars option builder. Shared (mode-agnostic)
 * constants live in `ui.config.ts`.
 */

/**
 * Number of placeholder rows the skeleton view-model emits.
 */
export const SKELETON_ROW_COUNT = 8;

/**
 * Half-width of the synthetic time window used when no instance
 * prefetch has arrived yet — axis renders `[now - w, now + w]`.
 */
export const SYNTHETIC_AXIS_WINDOW_MS = 30 * 60 * 1000;

/**
 * Lower bound of the deterministic per-row placeholder bar width.
 */
export const SKELETON_MIN_BAR_DURATION_MS = 2 * 60 * 1000;

/**
 * Upper bound of the deterministic per-row placeholder bar width. The
 * assembler cycles `SKELETON_OFFSET_FRACTIONS` keyed by `rowIndex` and
 * scales each fraction into `[MIN, MAX]`.
 */
export const SKELETON_MAX_BAR_DURATION_MS = 20 * 60 * 1000;

/**
 * Deterministic fraction table cycled by `rowIndex % length`. Scaled
 * into `[SKELETON_MIN_BAR_DURATION_MS, SKELETON_MAX_BAR_DURATION_MS]`
 * to produce stable, visually-varied placeholder widths without any
 * RNG.
 */
export const SKELETON_OFFSET_FRACTIONS = [
    0.42, 0.78, 0.18, 0.95, 0.31, 0.62, 0.07, 0.55,
] as const;

/**
 * Light-gray fill applied to every skeleton placeholder rect. The
 * keyframe animation modulates its opacity to produce the breathing
 * shimmer effect.
 */
export const SKELETON_FILL_COLOR = 'rgba(0,0,0,0.12)';

/**
 * Total cycle duration (ms) of the skeleton shimmer per row.
 */
export const SKELETON_KEYFRAME_DURATION_MS = 1400;

/**
 * Per-row phase offset (ms) added to the keyframe `delay`. Row `n`
 * starts its shimmer `n * SKELETON_ROW_PHASE_OFFSET_MS` after row 0.
 */
export const SKELETON_ROW_PHASE_OFFSET_MS = 180;

/**
 * Keyframe opacity values for the shimmer fade.
 */
export const SKELETON_OPACITY_MIN = 0.35;
export const SKELETON_OPACITY_MAX = 0.9;

/**
 * Easing curve applied to the looping shimmer keyframes. Sinusoidal
 * in-out produces a natural breathing rhythm — no perceptible velocity
 * jumps at the opacity extremes, unlike the default linear curve.
 */
export const SKELETON_SHIMMER_EASING = 'sinusoidalInOut';

/**
 * Duration of the one-shot mount fade-in per row, in milliseconds.
 * Tuned so the slowest row finishes before the shimmer's first
 * brightening peak — avoids a visible discontinuity at handoff.
 */
export const SKELETON_FADE_IN_DURATION_MS = 400;

/**
 * Per-row delay multiplier for the fade-in stagger. Row `n` starts
 * fading in at `n * SKELETON_FADE_IN_STAGGER_MS` so rows appear in a
 * cascade rather than all at once.
 */
export const SKELETON_FADE_IN_STAGGER_MS = 90;

/**
 * Easing applied to the mount fade-in. Cubic-out front-loads the
 * progress so the row reaches near-final opacity quickly and settles
 * — matches the Material Design standard ease-out feel.
 */
export const SKELETON_FADE_IN_EASING = 'cubicOut';
