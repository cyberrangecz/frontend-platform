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

/**
 * Per-lag-state color palette.
 *
 * Values mirror the legacy palette documented in `../../../../../.docs/progress-visualization/visuals.md`.
 * Authoritative status pending design review — candidates for moving to
 * theme tokens (`@crczp/theme`) during the design pass.
 */
export const LAG_STATE_COLORS: Readonly<Record<LagState, string>> = {
    UNKNOWN: 'rgba(84,112,198,1)',
    OK: 'rgba(76,175,80,1)',
    WARNING: 'rgba(255,152,0,1)',
    LATE: 'rgba(244,67,54,1)',
    ABANDONED: 'rgb(92,68,68)',
    INACTIVE: 'rgb(167,200,223)',
    INACTIVE_HIGHLIGHTED: 'rgb(106,106,106)',
} as const;

/**
 * Human-readable labels for the lag-state legend. Pulled from a single
 * source so the legend builder and the filter-toggle path stay in sync.
 */
export const LAG_STATE_LABELS: Readonly<Record<LagState, string>> = {
    UNKNOWN: 'Unknown',
    OK: 'On Track',
    WARNING: 'Warning',
    LATE: 'Late',
    ABANDONED: 'Abandoned',
    INACTIVE: 'Inactive',
    INACTIVE_HIGHLIGHTED: 'Inactive (highlighted)',
} as const;
