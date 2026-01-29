import {
    ProgressLevelInfo,
    ProgressLevelVisualizationData,
    ProgressState,
} from '@crczp/visualization-model';
import { LagState } from '../chart-utility-types';

/**
 * Core lag state calculation module.
 *
 * Determines if trainees are on track, late, abandoned, etc.
 * Used for:
 * - Bar colors
 * - Legend filtering/counts
 * - Lag-based sorting
 *
 * Two evaluation modes:
 * 1. Short estimates (<5min): Fixed time thresholds
 * 2. Long estimates: Percentage thresholds
 *
 * Why dual mode? 20% of 2min = 24s (too lenient), so short tasks use absolute times.
 */

/**
 * Converts estimated duration from minutes to milliseconds for time calculations.
 * @param minutes - Duration in minutes
 * @returns Duration in milliseconds
 */
function minutesToUnix(minutes: number): number {
    return minutes * 60 * 1000;
}

/**
 * All possible lag states in display order.
 * Used for legend items, dummy series.
 */
export const ALL_LAG_STATES: LagState[] = [
    'OK',
    'WARNING',
    'LATE',
    'ABANDONED',
    'UNKNOWN',
] as const;

/**
 * Human-readable labels for lag states (legend text).
 */
const STATE_TO_LABEL: Record<LagState, string> = {
    OK: 'On Track',
    WARNING: 'Warning',
    LATE: 'Late',
    ABANDONED: 'Not progressing',
    UNKNOWN: 'Unknown',
} as const;

/**
 * Reverse mapping: label → LagState enum.
 * Used for legend selection → filtering.
 * Generated from STATE_TO_LABEL.
 */
const LABEL_TO_STATE = Object.fromEntries(
    Object.entries(STATE_TO_LABEL).map(([key, value]) => [value, key]),
) as Record<string, LagState>;

/**
 * Fixed time thresholds for short estimates (<5min).
 *
 * Why fixed? Percentage too lenient for short tasks.
 * Example: 20% of 2min = 24s (not meaningful).
 *
 * @remarks
 * - maxThresholdMs: Use fixed if estimate < 5min
 * - warningMs: 2min late = warning
 * - lateMs: 5min late = late
 * - abandonedMs: 60min late = abandoned
 */
const TOTAL_TIME_LAG_EVALUATION = {
    maxThresholdMs: minutesToUnix(5),
    warningMs: minutesToUnix(2),
    lateMs: minutesToUnix(5),
    abandonedMs: minutesToUnix(60),
} as const;

/**
 * Percentage thresholds for long estimates (>=5min).
 *
 * Relative delays make sense for longer tasks.
 *
 * - warningPercentage: 10% over estimate
 * - latePercentage: 30% over
 * - abandonedPercentage: 200% over (2x estimate)
 */
const PERCENTAGE_LAG_EVALUATION = {
    warningPercentage: 10,
    latePercentage: 30,
    abandonedPercentage: 200,
} as const;

/**
 * Calculates raw lag time in milliseconds for sorting and analysis.
 * Returns difference between elapsed time and estimated duration.
 * @param currentLevel - Currently running level data
 * @param levelInfo - Level metadata containing estimate
 * @param currentTime - Current timestamp for calculation
 * @returns Lag time in milliseconds (negative if ahead, Infinity if data missing)
 */
function calculateLagTime(
    currentLevel: ProgressLevelVisualizationData,
    levelInfo: ProgressLevelInfo,
    currentTime: number,
): number {
    if (!currentLevel || !levelInfo) {
        return Infinity;
    }
    const elapsedTime = currentTime - currentLevel.startTime;
    const estimatedDurationMs = levelInfo.estimatedDuration * 60 * 1000;

    return elapsedTime - estimatedDurationMs;
}

/**
 * Calculates lag percentage relative to estimated duration for normalized comparison.
 * Useful for comparing delays across tasks with different time estimates.
 * @param currentLevel - Currently running level data
 * @param levelInfo - Level metadata containing estimate
 * @param currentTime - Current timestamp for calculation
 * @returns Lag percentage (negative if ahead, Infinity if data missing)
 */
function calculateLagPercentage(
    currentLevel: ProgressLevelVisualizationData,
    levelInfo: ProgressLevelInfo,
    currentTime: number,
): number {
    if (
        !currentLevel ||
        !levelInfo ||
        !levelInfo.estimatedDuration ||
        levelInfo.estimatedDuration === 0
    ) {
        return Infinity;
    }
    const elapsedTime = currentTime - currentLevel.startTime;
    const estimatedDurationMs = levelInfo.estimatedDuration * 60 * 1000;
    const lagTime = elapsedTime - estimatedDurationMs;
    return (lagTime / estimatedDurationMs) * 100;
}

/**
 * Determines if an estimate should use fixed time thresholds instead of percentages.
 * Short estimates (<5 minutes) use fixed thresholds as percentages would be too lenient.
 * @param estimatedDurationMs - Estimated duration in milliseconds
 * @returns True if estimate should use fixed thresholds
 */
function isShortEstimate(estimatedDurationMs: number): boolean {
    return estimatedDurationMs < TOTAL_TIME_LAG_EVALUATION.maxThresholdMs;
}

/**
 * Evaluates lag state for short estimates using fixed time thresholds.
 * Maps delay duration to WARNING, LATE, or ABANDONED based on predefined thresholds.
 * @param delay - Positive delay in milliseconds
 * @returns Lag state classification
 */
function evaluateShortEstimateLag(delay: number): LagState {
    if (delay < TOTAL_TIME_LAG_EVALUATION.warningMs) {
        return 'WARNING';
    } else if (delay <= TOTAL_TIME_LAG_EVALUATION.lateMs) {
        return 'LATE';
    } else {
        return 'ABANDONED';
    }
}

/**
 * Evaluates lag state for long estimates using percentage-based thresholds.
 * More appropriate for longer tasks where relative delay matters more than absolute time.
 * @param delayPercentage - Positive delay percentage
 * @returns Lag state classification including OK for on-time completion
 */
function evaluateLongEstimateLag(delayPercentage: number): LagState {
    if (delayPercentage < PERCENTAGE_LAG_EVALUATION.warningPercentage) {
        return 'OK';
    } else if (
        delayPercentage >= PERCENTAGE_LAG_EVALUATION.warningPercentage &&
        delayPercentage <= PERCENTAGE_LAG_EVALUATION.latePercentage
    ) {
        return 'WARNING';
    } else if (
        delayPercentage > PERCENTAGE_LAG_EVALUATION.latePercentage &&
        delayPercentage < PERCENTAGE_LAG_EVALUATION.abandonedPercentage
    ) {
        return 'LATE';
    } else {
        return 'ABANDONED';
    }
}

/**
 * Core lag state classification algorithm for determining progress status.
 * Implements dual evaluation mode: fixed thresholds for short estimates, percentages for long estimates.
 * @param state - Current progress state of the level
 * @param startTime - Timestamp when the level was started
 * @param estimatedDuration - Expected duration in minutes, null if not available
 * @param currentTime - Current timestamp for calculation
 * @returns Lag state classification determining bar color and filtering
 */
function getLagState(
    state: ProgressState | null,
    startTime: number,
    estimatedDuration: number | null,
    currentTime: number,
): LagState {
    if (state !== 'RUNNING') {
        return 'UNKNOWN';
    }

    if (!estimatedDuration) {
        return 'UNKNOWN';
    }

    const estimatedDurationMs = estimatedDuration * 60 * 1000;
    const estimatedEndTime = startTime + estimatedDurationMs;

    if (estimatedEndTime >= currentTime) {
        return 'OK';
    }

    const delay = currentTime - estimatedEndTime;

    if (isShortEstimate(estimatedDurationMs)) {
        return evaluateShortEstimateLag(delay);
    }

    const delayPercentage = (delay / estimatedDurationMs) * 100;
    return evaluateLongEstimateLag(delayPercentage);
}

/**
 * Bar color state (LagState + inactive states).
 * Used by BarStyleUtils.getBarState().
 *
 * INACTIVE: Non-running levels (dimmed)
 * INACTIVE_HIGHLIGHTED: Non-running but highlighted level
 */
export type EstimateState = LagState | 'INACTIVE' | 'INACTIVE_HIGHLIGHTED';

/**
 * Determines bar styling state considering both lag status and visual highlighting.
 * Extends lag state logic to handle highlighting scenarios for visual emphasis.
 * @param currentLevel - Current level data or null if no active level
 * @param levelInfo - Level metadata containing estimates
 * @param currentTime - Current timestamp for lag calculation
 * @param isHighlighted - Whether this specific level is being highlighted
 * @param isOtherHighlighted - Whether a different level is highlighted (should dim this one)
 * @returns Visual styling state for bar rendering
 */
function getEstimateState(
    currentLevel: ProgressLevelVisualizationData | null,
    levelInfo: ProgressLevelInfo | null,
    currentTime: number,
    isHighlighted: boolean,
    isOtherHighlighted: boolean,
): EstimateState {
    if (!currentLevel) {
        return isHighlighted ? 'INACTIVE_HIGHLIGHTED' : 'INACTIVE';
    }

    if (isOtherHighlighted) {
        return 'INACTIVE';
    }

    if (currentLevel.state !== 'RUNNING') {
        return isHighlighted ? 'INACTIVE_HIGHLIGHTED' : 'INACTIVE';
    }

    if (!levelInfo || !levelInfo.estimatedDuration) {
        return 'UNKNOWN';
    }

    const estimatedDurationMs = levelInfo.estimatedDuration * 60 * 1000;
    const estimatedEndTime = currentLevel.startTime + estimatedDurationMs;

    if (estimatedEndTime >= currentTime) {
        return 'OK';
    }

    const delay = currentTime - estimatedEndTime;

    if (isShortEstimate(estimatedDurationMs)) {
        return evaluateShortEstimateLag(delay);
    }

    const delayPercentage = (delay / estimatedDurationMs) * 100;
    return evaluateLongEstimateLag(delayPercentage);
}

export const LagStateUtils = {
    calculateLagPercentage,
    calculateLagTime,
    getLagState,
    getEstimateState,
    ALL_LAG_STATES,
    LABEL_TO_STATE,
    STATE_TO_LABEL,
} as const;
