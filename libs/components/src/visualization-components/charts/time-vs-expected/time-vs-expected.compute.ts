import { DifficultyLevelMeta } from '../level-difficulty/level-difficulty-source';
import { CompletedRow, StartedRow, TimeVsExpectedAggregate } from './time-vs-expected-source';

/** Milliseconds per minute — durations are computed in ms and reported in minutes. */
const MS_PER_MINUTE = 60_000;

/** Outlier ceiling for completion times, as a multiple of the level median. */
export const OUTLIER_CAP_MEDIAN_MULTIPLE = 5;

/** One completed level visit's duration, keyed to the run and trainee that produced it. */
export interface DurationSample {
    readonly runId: number;
    readonly userId: number;
    readonly levelOrder: number;
    /** Completion minus start, in milliseconds; always positive. */
    readonly actualMs: number;
}

/** One run's completed visit to a level, in minutes — the grain of the CSV export. */
export interface RunDuration {
    readonly runId: number;
    readonly userId: number;
    readonly actualMinutes: number;
}

/**
 * Summary statistics over a level's actual completion times, in minutes. Every field is
 * null when no run has completed the level, so callers never render measured-zero for
 * a level that simply has no data.
 */
export interface LevelTimingStats {
    readonly count: number;
    readonly median: number | null;
    readonly q1: number | null;
    readonly q3: number | null;
    readonly min: number | null;
    readonly max: number | null;
    readonly mean: number | null;
}

/** One training level joined with its actual completion times and summary statistics. */
export interface LevelTiming {
    readonly order: number;
    readonly title: string;
    /** Authored estimate, in minutes. */
    readonly estimateMinutes: number;
    /** Completion times of every completing run, in minutes, with outliers capped to the median-derived ceiling. */
    readonly samplesMinutes: readonly number[];
    /** Per-run completed visits with uncapped actual times, retained so the CSV can export one row each. */
    readonly runs: readonly RunDuration[];
    /** Number of runs whose actual time exceeded the ceiling and was clamped down. */
    readonly cappedCount: number;
    readonly stats: LevelTimingStats;
}

/**
 * Linear-interpolated quantile of an ascending-sorted numeric array.
 *
 * @param sorted Sample values sorted ascending.
 * @param fraction Quantile position in [0, 1] (e.g. 0.25 for the first quartile).
 * @returns The interpolated quantile value, or 0 for an empty input.
 */
export function quantileSorted(sorted: readonly number[], fraction: number): number {
    if (sorted.length === 0) return 0;
    const position = (sorted.length - 1) * fraction;
    const lowerIndex = Math.floor(position);
    const lower = sorted[lowerIndex] ?? 0;
    const upper = sorted[lowerIndex + 1] ?? lower;
    return lower + (position - lowerIndex) * (upper - lower);
}

/**
 * Pairs level visits with their completions, per run and level, yielding one duration per
 * completed visit. Each completion is matched with the most recent start that precedes it,
 * so a run that re-enters a level produces one sample per completion and a start with no
 * following completion (an active visit, or an orphaned start left in the cache) is never
 * paired with a distant completion.
 *
 * @param started   Level-started rows for the instance.
 * @param completed Level-completed rows for the instance.
 * @returns One {@link DurationSample} per matched start/completion pair.
 */
export function pairLevelDurations(
    started: readonly StartedRow[],
    completed: readonly CompletedRow[],
): DurationSample[] {
    const userByRun = new Map<number, number>();
    for (const row of started) userByRun.set(row.training_run_id, row.user_ref_id);

    const startsByKey = new Map<string, number[]>();
    for (const row of started) {
        const key = `${row.training_run_id}:${row.level_order}`;
        const list = startsByKey.get(key) ?? [];
        list.push(row.timestamp);
        startsByKey.set(key, list);
    }

    const completesByKey = new Map<string, number[]>();
    for (const row of completed) {
        const key = `${row.training_run_id}:${row.level_order}`;
        const list = completesByKey.get(key) ?? [];
        list.push(row.timestamp);
        completesByKey.set(key, list);
    }

    const samples: DurationSample[] = [];
    for (const [key, completes] of completesByKey) {
        const starts = startsByKey.get(key);
        if (!starts) continue;
        const [runIdText, levelText] = key.split(':');
        const runId = Number(runIdText);
        const levelOrder = Number(levelText);
        const userId = userByRun.get(runId) ?? -1;
        const sortedStarts = [...starts].sort((a, b) => a - b);
        const sortedCompletes = [...completes].sort((a, b) => a - b);
        const availableStarts: number[] = [];
        let startCursor = 0;
        for (const completion of sortedCompletes) {
            while (startCursor < sortedStarts.length) {
                const candidate = sortedStarts[startCursor];
                if (candidate === undefined || candidate > completion) break;
                availableStarts.push(candidate);
                startCursor++;
            }
            const start = availableStarts.pop();
            if (start === undefined) continue;
            const durationMs = completion - start;
            if (durationMs > 0) {
                samples.push({ runId, userId, levelOrder, actualMs: durationMs });
            }
        }
    }
    return samples;
}

/**
 * Computes summary statistics for a level's actual completion times.
 *
 * @param values Actual completion times for one level, in minutes.
 * @returns Statistics with null fields when the input is empty.
 */
function statsOf(values: readonly number[]): LevelTimingStats {
    if (values.length === 0) {
        return { count: 0, median: null, q1: null, q3: null, min: null, max: null, mean: null };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((total, value) => total + value, 0);
    return {
        count: sorted.length,
        median: quantileSorted(sorted, 0.5),
        q1: quantileSorted(sorted, 0.25),
        q3: quantileSorted(sorted, 0.75),
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        mean: sum / sorted.length,
    };
}

/**
 * Clamps completion times to {@link OUTLIER_CAP_MEDIAN_MULTIPLE}× the median so a single
 * very long visit (e.g. a trainee who stepped away mid-level) cannot dominate the level's
 * spread or stretch the axis. The cap is derived from the raw median on every call and
 * applied in one pass, so the result is a pure function of the input — repeated computation
 * never compounds the cap.
 *
 * @param values Actual completion times for one level, in minutes.
 * @returns The clamped values and the count of entries that exceeded the ceiling.
 */
function capOutlierTimes(values: readonly number[]): { values: number[]; cappedCount: number } {
    if (values.length === 0) return { values: [...values], cappedCount: 0 };
    const median = quantileSorted([...values].sort((a, b) => a - b), 0.5);
    if (median <= 0) return { values: [...values], cappedCount: 0 };
    const cap = median * OUTLIER_CAP_MEDIAN_MULTIPLE;
    let cappedCount = 0;
    const clamped = values.map((value) => {
        if (value > cap) {
            cappedCount++;
            return cap;
        }
        return value;
    });
    return { values: clamped, cappedCount };
}

/**
 * Joins the resolved training levels with their paired durations into one timing entry
 * per level, in definition order. Levels with no completed visits keep their estimate
 * and an empty sample set rather than being dropped.
 *
 * @param meta      Ordered training-level metadata (title + authored estimate in ms).
 * @param aggregate Raw level-started and level-completed rows for the instance.
 * @returns One {@link LevelTiming} per training level.
 */
export function computeLevelTimings(
    meta: readonly DifficultyLevelMeta[],
    aggregate: TimeVsExpectedAggregate,
): LevelTiming[] {
    const samples = pairLevelDurations(aggregate.startedRows, aggregate.completedRows);
    const samplesByOrder = new Map<number, DurationSample[]>();
    for (const sample of samples) {
        const list = samplesByOrder.get(sample.levelOrder) ?? [];
        list.push(sample);
        samplesByOrder.set(sample.levelOrder, list);
    }

    return meta.map((level): LevelTiming => {
        const levelSamples = samplesByOrder.get(level.order) ?? [];
        const runs = levelSamples.map(
            (sample): RunDuration => ({
                runId: sample.runId,
                userId: sample.userId,
                actualMinutes: sample.actualMs / MS_PER_MINUTE,
            }),
        );
        const { values: samplesMinutes, cappedCount } = capOutlierTimes(runs.map((run) => run.actualMinutes));
        return {
            order: level.order,
            title: level.title,
            estimateMinutes: level.estimatedDurationMs / MS_PER_MINUTE,
            samplesMinutes,
            runs,
            cappedCount,
            stats: statsOf(samplesMinutes),
        };
    });
}
