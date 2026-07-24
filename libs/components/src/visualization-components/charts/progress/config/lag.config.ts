import { PALETTE } from '../../shared';
import { LagState } from '../types/lag-state.types';

/**
 * Lag classification thresholds. Two modes, picked by estimate length.
 *
 *  - Short-estimate mode (estimate < SHORT_ESTIMATE_THRESHOLD_MS): absolute
 *    time thresholds against the delay past the estimate.
 *  - Long-estimate mode: percentage thresholds against the estimate.
 *
 * The vocabulary `OK | WARNING | LATE | ABANDONED` lives in
 * `types/lag-state.types.ts`. Selector logic lives in
 * `selectors/with-lag-state.ts`.
 */
export const SHORT_ESTIMATE_THRESHOLD_MS = 5 * 60 * 1000;

export interface ShortEstimateThresholds {
    /** Delay (ms) above which the bar moves from OK to WARNING. */
    readonly warningMs: number;
    /** Delay (ms) above which the bar moves from WARNING to LATE. */
    readonly lateMs: number;
}

export const SHORT_ESTIMATE_THRESHOLDS: ShortEstimateThresholds = {
    warningMs: 2 * 60 * 1000,
    lateMs: 5 * 60 * 1000,
};

export interface LongEstimateThresholds {
    /** Lag percentage above which the bar moves from OK to WARNING. */
    readonly warningPercentage: number;
    /** Lag percentage above which the bar moves from WARNING to LATE. */
    readonly latePercentage: number;
    /** Lag percentage above which the bar moves from LATE to ABANDONED. */
    readonly abandonedPercentage: number;
}

export const LONG_ESTIMATE_THRESHOLDS: LongEstimateThresholds = {
    warningPercentage: 10,
    latePercentage: 30,
    abandonedPercentage: 200,
};

/** Fraction of the estimate granted as grace before a bar leaves OK. */
export const GRACE_PERIOD_FRACTION = 0.05;

/** Floor (ms) applied to the grace period so brief estimates still get an allowance. */
export const GRACE_PERIOD_MINIMUM_MS = 2 * 60 * 1000;

/**
 * Single neutral, primary-toned fill for every finished level bar. Finished
 * levels no longer convey lag through colour; lag-state colours are reserved
 * for active levels, leaving running bars as the only vivid bars on screen.
 */
export const FINISHED_LEVEL_FILL_COLOR = 'rgb(167,200,223)';

/** Per-lag-state bar fill colour; semantic states bind the shared palette. */
export const LAG_STATE_COLORS: Readonly<Record<LagState, string>> = {
    COMPLETED: PALETTE.blue.color,
    OK: PALETTE.green.color,
    WARNING: PALETTE.orange.color,
    LATE: PALETTE.red.color,
    ABANDONED: PALETTE.darkGray.color,
    INACTIVE: 'rgb(167,200,223)',
    INACTIVE_HIGHLIGHTED: PALETTE.gray.color,
} as const;

/** Value colour for time gained against the estimate (ahead of schedule). */
export const ESTIMATE_GAIN_COLOR = PALETTE.green.color;

/** Value colour for time lost against the estimate (behind schedule). */
export const ESTIMATE_LOSS_COLOR = PALETTE.red.color;

/**
 * Human-readable labels for the lag-state legend. Pulled from a single
 * source so the legend builder and the filter-toggle path stay in sync.
 */
export const LAG_STATE_LABELS: Readonly<Record<LagState, string>> = {
    COMPLETED: 'Completed',
    OK: 'On Track',
    WARNING: 'Warning',
    LATE: 'Late',
    ABANDONED: 'Abandoned',
    INACTIVE: 'Inactive',
    INACTIVE_HIGHLIGHTED: 'Inactive (highlighted)',
} as const;
