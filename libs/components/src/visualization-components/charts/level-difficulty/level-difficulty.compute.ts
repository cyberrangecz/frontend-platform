import { PALETTE } from '../shared';
import {
    DifficultyAggregateRow,
    DifficultyLevelMeta,
    EndedRow,
    LevelScopedRow,
    StartedRow,
} from './level-difficulty-source';

/** Upper bound for the time axis: actual time capped at twice (200% of) the estimate. */
export const TIME_RATIO_CAP = 2;

/**
 * One training level's computed difficulty fingerprint. The three event measures are raw
 * counts (a trainee may contribute many), compared on a scale shared across all levels;
 * `timeRatio`, `difficultyScore` are null when their data is absent rather than zero.
 */
export interface LevelDifficultyPanel {
    readonly order: number;
    readonly title: string;
    /** Distinct trainees who started this level — shown for context, not a denominator. */
    readonly startedCount: number;
    /** Whether any trainee started this level (false → the panel has no data to show). */
    readonly hasData: boolean;
    /** Raw count of wrong-answer submissions at this level. */
    readonly wrongCount: number;
    /** Raw count of hints taken at this level. */
    readonly hintCount: number;
    /** Raw count of solution reveals at this level. */
    readonly solutionCount: number;
    /** Runs whose time-on-level was measurable and feed the time median. */
    readonly timeSampleCount: number;
    /** Median actual-to-estimated time ratio (0–2, capped); null when no run is time-bounded. */
    readonly timeRatio: number | null;
    /** Polygon-area difficulty as a 0–100 score; null when the level has no data. */
    readonly difficultyScore: number | null;
    /** Continuous green→red colour for the difficulty number. */
    readonly difficultyColor: string;
}

/** Per-axis count aggregated across all levels, used for the shared radar scale or tooltip total. */
export interface AxisCounts {
    readonly wrong: number;
    readonly hint: number;
    readonly solution: number;
}

/** View-model: per-level panels plus the cross-level scales that make them comparable. */
export interface LevelDifficultyVm {
    readonly panels: readonly LevelDifficultyPanel[];
    /** Largest single-level count per axis — the shared radar axis maximum. */
    readonly axisMax: AxisCounts;
    /** Total count per axis across all levels — the tooltip denominator. */
    readonly totals: AxisCounts;
}

/**
 * Groups level-scoped rows into a map of level_order → set of distinct trainee ids.
 *
 * @param rows Rows carrying a trainee id and the level they occurred on.
 * @returns    Map from level order to the distinct trainees observed at that level.
 */
function distinctUsersByLevel(rows: readonly LevelScopedRow[]): Map<number, Set<number>> {
    const result = new Map<number, Set<number>>();
    for (const row of rows) {
        let users = result.get(row.level_order);
        if (!users) {
            users = new Set<number>();
            result.set(row.level_order, users);
        }
        users.add(row.user_ref_id);
    }
    return result;
}

/**
 * Counts rows (raw events, duplicates included) per level order.
 *
 * @param rows Level-scoped event rows; one entry per event occurrence.
 * @returns    Map from level order to the raw event count at that level.
 */
function countByLevel(rows: readonly LevelScopedRow[]): Map<number, number> {
    const result = new Map<number, number>();
    for (const row of rows) {
        result.set(row.level_order, (result.get(row.level_order) ?? 0) + 1);
    }
    return result;
}

/**
 * Computes, per level, the list of actual-to-estimated time ratios across runs. A run's
 * time on a started level is bounded by its next started level, or by the run-end for the
 * last started level; runs with neither bound contribute no ratio. Levels with no estimate
 * are skipped.
 *
 * @param startedRows     All level-started rows for the instance.
 * @param endedRows       All run-ended rows, providing the last level's upper bound.
 * @param estimateByOrder Map of level order → authored estimate in milliseconds.
 * @returns               Map from level order to its collected time ratios.
 */
function timeRatiosByLevel(
    startedRows: readonly StartedRow[],
    endedRows: readonly EndedRow[],
    estimateByOrder: ReadonlyMap<number, number>,
): Map<number, number[]> {
    const endByRun = new Map<number, number>();
    for (const row of endedRows) endByRun.set(row.training_run_id, row.end_time);

    const eventsByRun = new Map<number, { level_order: number; timestamp: number }[]>();
    for (const row of startedRows) {
        let events = eventsByRun.get(row.training_run_id);
        if (!events) {
            events = [];
            eventsByRun.set(row.training_run_id, events);
        }
        events.push({ level_order: row.level_order, timestamp: row.timestamp });
    }

    const ratios = new Map<number, number[]>();
    for (const [runId, events] of eventsByRun) {
        events.sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < events.length; i++) {
            const current = events[i]!;
            const next = events[i + 1];
            const endTs = next ? next.timestamp : endByRun.get(runId);
            if (endTs === undefined) continue;
            const actualMs = endTs - current.timestamp;
            if (actualMs <= 0) continue;
            const estimateMs = estimateByOrder.get(current.level_order);
            if (estimateMs === undefined || estimateMs <= 0) continue;
            let collected = ratios.get(current.level_order);
            if (!collected) {
                collected = [];
                ratios.set(current.level_order, collected);
            }
            collected.push(actualMs / estimateMs);
        }
    }
    return ratios;
}

/**
 * Median of a non-empty numeric list (mean of the two middle values on even counts).
 *
 * @param values Numeric values; must be non-empty.
 * @returns      The median value.
 */
function median(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Maps a difficulty fraction (0–1) to a continuous green→red colour: 0 is green, 1 is red,
 * passing through yellow at the midpoint, via an HSL hue sweep so the scale is smooth.
 *
 * @param fraction Difficulty fraction in [0,1]; values outside are clamped.
 * @returns        An `hsl(...)` colour string for the difficulty number.
 */
function difficultyColor(fraction: number): string {
    const clamped = Math.min(1, Math.max(0, fraction));
    const hue = Math.round(120 * (1 - clamped));
    return `hsl(${hue}, 65%, 42%)`;
}

/**
 * Fraction (0–1) of the maximum radar-polygon area covered by the given normalised axis
 * radii. For a regular N-axis radar the polygon area is ½·sin(2π/N)·Σ rᵢ·rᵢ₊₁ and its
 * maximum (every radius 1) is ½·sin(2π/N)·N, so the covered fraction reduces to
 * (Σ rᵢ·rᵢ₊₁)/N — independent of the angular term and the axis count.
 *
 * @param radii Normalised axis values in [0,1], in the polygon's vertex order.
 * @returns     The covered-area fraction in [0,1] (0 for fewer than two axes).
 */
function polygonAreaFraction(radii: readonly number[]): number {
    const axisCount = radii.length;
    if (axisCount < 2) return 0;
    let pairwise = 0;
    for (let i = 0; i < axisCount; i++) {
        pairwise += (radii[i] ?? 0) * (radii[(i + 1) % axisCount] ?? 0);
    }
    return pairwise / axisCount;
}

/**
 * Builds one difficulty panel for a level with at least one started trainee. Each event
 * count is normalised against the largest single-level count for that axis, so the panels
 * share one scale; difficulty is the share of the radar polygon's maximum area it covers
 * (the time axis joins the polygon only when measured).
 *
 * @param level        The training level's metadata.
 * @param startedCount Distinct trainees who started the level (> 0).
 * @param wrongCount   Raw wrong-answer count at the level.
 * @param hintCount    Raw hint count at the level.
 * @param solutionCount Raw solution-reveal count at the level.
 * @param ratios       Collected actual-to-estimated time ratios for the level (may be empty).
 * @param axisMax      Largest single-level count per axis, used to normalise this level.
 * @returns            The level's difficulty panel.
 */
function buildPanel(
    level: DifficultyLevelMeta,
    startedCount: number,
    wrongCount: number,
    hintCount: number,
    solutionCount: number,
    ratios: readonly number[],
    axisMax: AxisCounts,
): LevelDifficultyPanel {
    const wrongNorm = axisMax.wrong > 0 ? wrongCount / axisMax.wrong : 0;
    const hintNorm = axisMax.hint > 0 ? hintCount / axisMax.hint : 0;
    const solutionNorm = axisMax.solution > 0 ? solutionCount / axisMax.solution : 0;
    const timeRatio = ratios.length > 0 ? Math.min(median(ratios), TIME_RATIO_CAP) : null;
    const radii =
        timeRatio === null
            ? [wrongNorm, hintNorm, solutionNorm]
            : [wrongNorm, hintNorm, solutionNorm, timeRatio / TIME_RATIO_CAP];
    const areaFraction = polygonAreaFraction(radii);
    return {
        order: level.order,
        title: level.title,
        startedCount,
        hasData: true,
        wrongCount,
        hintCount,
        solutionCount,
        timeSampleCount: ratios.length,
        timeRatio,
        difficultyScore: Math.round(areaFraction * 100),
        difficultyColor: difficultyColor(areaFraction),
    };
}

/**
 * Builds the per-level difficulty view-model from the resolved training levels and the raw
 * event aggregate. Event measures are raw counts compared on a scale shared across all
 * levels (per-axis max for the radar, per-axis sum for the tooltip total). Levels with no
 * started trainees are flagged as having no data rather than rendered as zero difficulty.
 *
 * @param meta Ordered training-level metadata (title + authored estimate).
 * @param data Raw event aggregate for the instance.
 * @returns    View-model with one {@link LevelDifficultyPanel} per training level plus shared scales.
 */
export function computeLevelDifficulty(
    meta: readonly DifficultyLevelMeta[],
    data: DifficultyAggregateRow,
): LevelDifficultyVm {
    const startedByLevel = distinctUsersByLevel(data.startedRows);
    const wrongByLevel = countByLevel(data.wrongRows);
    const hintByLevel = countByLevel(data.hintRows);
    const solutionByLevel = countByLevel(data.solutionRows);
    const estimateByOrder = new Map<number, number>(meta.map((level) => [level.order, level.estimatedDurationMs]));
    const ratiosByLevel = timeRatiosByLevel(data.startedRows, data.endedRows, estimateByOrder);

    let maxWrong = 0;
    let maxHint = 0;
    let maxSolution = 0;
    let totalWrong = 0;
    let totalHint = 0;
    let totalSolution = 0;
    for (const level of meta) {
        const wrong = wrongByLevel.get(level.order) ?? 0;
        const hint = hintByLevel.get(level.order) ?? 0;
        const solution = solutionByLevel.get(level.order) ?? 0;
        maxWrong = Math.max(maxWrong, wrong);
        maxHint = Math.max(maxHint, hint);
        maxSolution = Math.max(maxSolution, solution);
        totalWrong += wrong;
        totalHint += hint;
        totalSolution += solution;
    }
    const axisMax: AxisCounts = { wrong: maxWrong, hint: maxHint, solution: maxSolution };
    const totals: AxisCounts = { wrong: totalWrong, hint: totalHint, solution: totalSolution };

    const panels = meta.map((level): LevelDifficultyPanel => {
        const startedCount = startedByLevel.get(level.order)?.size ?? 0;
        if (startedCount === 0) {
            return {
                order: level.order,
                title: level.title,
                startedCount: 0,
                hasData: false,
                wrongCount: 0,
                hintCount: 0,
                solutionCount: 0,
                timeSampleCount: 0,
                timeRatio: null,
                difficultyScore: null,
                difficultyColor: PALETTE.gray.color,
            };
        }
        return buildPanel(
            level,
            startedCount,
            wrongByLevel.get(level.order) ?? 0,
            hintByLevel.get(level.order) ?? 0,
            solutionByLevel.get(level.order) ?? 0,
            ratiosByLevel.get(level.order) ?? [],
            axisMax,
        );
    });

    return { panels, axisMax, totals };
}
