import { BarRow, BarWithLag, LagTransition, LevelInfo } from '../types/bar.types';
import { LevelId } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import {
    LONG_ESTIMATE_THRESHOLDS,
    SHORT_ESTIMATE_THRESHOLD_MS,
    SHORT_ESTIMATE_THRESHOLDS,
} from '../config/lag.config';

/**
 * Attaches the lag classification and the resolved effective right edge
 * to every bar row.
 *
 *  - `effectiveEnd` = `completedAt ?? runEndedAt ?? evaluationNow`
 *  - `evaluationNow` = `min(now, instanceEndMs)` (the lag clamp per D4)
 *
 * Bars whose level has no estimate (`estimatedDurationMs === 0`) are
 * classified `OK`. Bars that have either completed or hit the run-end
 * terminator still receive a classification, computed at their frozen
 * effective end.
 *
 * This is the sole selector that reads the live `now` tick. Downstream
 * selectors operate on the materialised `effectiveEnd`.
 *
 * Highlight decoration (per-bar `isHighlighted` / `isOtherHighlighted`)
 * lives in the view-model assembler — not here. This selector stays
 * focused on lag classification only.
 *
 * @param bars          Source bar rows.
 * @param levelsById    Per-level metadata (estimates).
 * @param mountNowMs    Current tick value, in ms.
 * @param instanceEndMs Instance end time, ms. `null` while prefetch pending.
 */
export function withLagState(
    bars: readonly BarRow[],
    levelsById: ReadonlyMap<LevelId, LevelInfo>,
    mountNowMs: number,
    instanceEndMs: number | null,
): readonly BarWithLag[] {
    const evaluationNow = instanceEndMs === null ? mountNowMs : Math.min(mountNowMs, instanceEndMs);

    const result: BarWithLag[] = [];
    for (const bar of bars) {
        result.push(decorateBar(bar, levelsById, evaluationNow, mountNowMs));
    }
    return result;
}

function decorateBar(
    bar: BarRow,
    levelsById: ReadonlyMap<LevelId, LevelInfo>,
    evaluationNow: number,
    mountNowMs: number,
): BarWithLag {
    const effectiveEnd = resolveEffectiveEnd(bar, evaluationNow);
    const isRunning = bar.completedAt === null && bar.runEndedAt === null;

    const level = levelsById.get(bar.levelId);
    const estimateMs = level === undefined ? 0 : level.estimatedDurationMs;

    const classification = classifyLag(bar.startedAt, effectiveEnd, estimateMs);

    const transitions =
        isRunning && estimateMs > 0
            ? computeTransitions(bar.startedAt, estimateMs, mountNowMs)
            : [];

    return {
        ...bar,
        effectiveEnd,
        isRunning,
        lagState: classification.lagState,
        lagMs: classification.lagMs,
        lagPercentage: classification.lagPercentage,
        transitions,
    };
}

function computeTransitions(
    startedAt: number,
    estimatedDurationMs: number,
    mountNowMs: number,
): readonly LagTransition[] {
    const isShortMode = estimatedDurationMs < SHORT_ESTIMATE_THRESHOLD_MS;
    const allCrossings: LagTransition[] = isShortMode
        ? computeShortModeCrossings(startedAt, estimatedDurationMs)
        : computeLongModeCrossings(startedAt, estimatedDurationMs);

    return allCrossings.filter((t) => t.atMs > mountNowMs);
}

function computeShortModeCrossings(
    startedAt: number,
    estimatedDurationMs: number,
): LagTransition[] {
    const estimateEndMs = startedAt + estimatedDurationMs;
    return [
        { atMs: estimateEndMs, toState: 'WARNING' },
        { atMs: estimateEndMs + SHORT_ESTIMATE_THRESHOLDS.warningMs, toState: 'LATE' },
        { atMs: estimateEndMs + SHORT_ESTIMATE_THRESHOLDS.lateMs, toState: 'ABANDONED' },
    ];
}

function computeLongModeCrossings(
    startedAt: number,
    estimatedDurationMs: number,
): LagTransition[] {
    const estimateEndMs = startedAt + estimatedDurationMs;
    return [
        { atMs: estimateEndMs, toState: 'WARNING' },
        {
            atMs:
                startedAt +
                estimatedDurationMs * (1 + LONG_ESTIMATE_THRESHOLDS.warningPercentage / 100),
            toState: 'LATE',
        },
        {
            atMs:
                startedAt +
                estimatedDurationMs * (1 + LONG_ESTIMATE_THRESHOLDS.abandonedPercentage / 100),
            toState: 'ABANDONED',
        },
    ];
}

function resolveEffectiveEnd(bar: BarRow, evaluationNow: number): number {
    if (bar.completedAt !== null) {
        return bar.completedAt;
    }
    if (bar.runEndedAt !== null) {
        return bar.runEndedAt;
    }
    return evaluationNow;
}

interface LagClassification {
    readonly lagState: LagState;
    readonly lagMs: number | null;
    readonly lagPercentage: number | null;
}

function classifyLag(
    startedAt: number,
    effectiveEnd: number,
    estimatedDurationMs: number,
): LagClassification {
    if (estimatedDurationMs <= 0) {
        return { lagState: 'OK', lagMs: null, lagPercentage: null };
    }

    const elapsedMs = effectiveEnd - startedAt;
    const lagMs = elapsedMs - estimatedDurationMs;

    const isShortMode = estimatedDurationMs < SHORT_ESTIMATE_THRESHOLD_MS;

    if (lagMs <= 0) {
        return { lagState: 'OK', lagMs, lagPercentage: isShortMode ? null : 0 };
    }

    if (isShortMode) {
        return {
            lagState: classifyShortMode(lagMs),
            lagMs,
            lagPercentage: null,
        };
    }

    const lagPercentage = (lagMs / estimatedDurationMs) * 100;
    return {
        lagState: classifyLongMode(lagPercentage),
        lagMs,
        lagPercentage,
    };
}

function classifyShortMode(delayMs: number): LagState {
    if (delayMs <= SHORT_ESTIMATE_THRESHOLDS.warningMs) {
        return 'WARNING';
    }
    if (delayMs <= SHORT_ESTIMATE_THRESHOLDS.lateMs) {
        return 'LATE';
    }
    return 'ABANDONED';
}

function classifyLongMode(delayPercentage: number): LagState {
    if (delayPercentage <= LONG_ESTIMATE_THRESHOLDS.warningPercentage) {
        return 'WARNING';
    }
    if (delayPercentage < LONG_ESTIMATE_THRESHOLDS.abandonedPercentage) {
        return 'LATE';
    }
    return 'ABANDONED';
}
