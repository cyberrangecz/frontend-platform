import { Utils } from '@crczp/utils';
import { BarWithLag } from '../types/bar.types';
import { asTraineeId, TraineeId } from '../types/ids.types';
import { SortCriterion, SortDirection } from '../types/ui-state.types';

// ---------------------------------------------------------------------------
// Private comparator helpers — not exported
// ---------------------------------------------------------------------------

/**
 * Applies the sort direction multiplier to an already-computed numeric delta.
 * Negative delta means a < b; positive means a > b.
 */
function applyDirection(delta: number, direction: SortDirection): number {
    return direction === 'DESC' ? -delta : delta;
}

/**
 * Orders bars by trainee display name under shared locale-aware collation.
 */
function compareByName(a: BarWithLag, b: BarWithLag): number {
    return Utils.String.compare(a.user.name, b.user.name);
}

/**
 * CURRENT_LEVEL_ORDER — compares the representative bar's level order.
 * Lower order = earlier in the training progression.
 */
function compareByLevelOrder(a: BarWithLag, b: BarWithLag): number {
    return a.levelOrder - b.levelOrder;
}

/**
 * CURRENT_SCORE — null scores are pushed to the tail regardless of direction
 * (spec: "push uncomplete to end"). Non-null scores are compared with direction.
 */
function compareByScore(
    a: BarWithLag,
    b: BarWithLag,
    direction: SortDirection,
): number {
    const aNullScore = a.scoreOnCompletion === null;
    const bNullScore = b.scoreOnCompletion === null;
    if (aNullScore && bNullScore) return 0;
    if (aNullScore) return 1;  // a always after b
    if (bNullScore) return -1; // b always after a
    // Both non-null after the guards above; TypeScript narrows through them.
    return applyDirection(
        (a.scoreOnCompletion as number) - (b.scoreOnCompletion as number),
        direction,
    );
}

/**
 * LAG_TIME — most-behind first under DESC, least-behind first under ASC.
 * Null lagMs (no estimate available) sinks to the end regardless of direction:
 * treated as -Infinity so DESC pushes it down and ASC also pushes it down via
 * the tail sentinel (a design decision: "unknown lag = least behind").
 */
function compareByLagTime(
    a: BarWithLag,
    b: BarWithLag,
    direction: SortDirection,
): number {
    const lagA = a.lagMs ?? -Infinity;
    const lagB = b.lagMs ?? -Infinity;
    return applyDirection(lagA - lagB, direction);
}

/**
 * LAG_PERCENTAGE — same direction semantics as LAG_TIME but uses the
 * percentage field. Null treated as -Infinity (no estimate = least behind).
 */
function compareByLagPercentage(
    a: BarWithLag,
    b: BarWithLag,
    direction: SortDirection,
): number {
    const lagA = a.lagPercentage ?? -Infinity;
    const lagB = b.lagPercentage ?? -Infinity;
    return applyDirection(lagA - lagB, direction);
}

/**
 * TRAINING_RUN_START — compares the run-start time derived as
 * min(startedAt) across all bars in the trainee's group, not the
 * representative bar's startedAt (which reflects only the current level).
 * Earliest joiner on top under ASC; latest joiner on top under DESC.
 */
function compareByRunStart(aRunStartMs: number, bRunStartMs: number): number {
    return aRunStartMs - bRunStartMs;
}

// ---------------------------------------------------------------------------
// Group-aware stable sort
// ---------------------------------------------------------------------------

/**
 * Picks the single representative bar from a trainee's bar group for
 * criterion comparison. The representative is the running bar when one
 * exists; otherwise the bar with the highest levelOrder (furthest progress).
 *
 * The same disambiguation the legacy implementation used (getCurrentLevel):
 * we want to characterise where the trainee currently is, not aggregate
 * across all their bars.
 */
function pickRepresentative(bars: readonly BarWithLag[]): BarWithLag {
    const running = bars.find((b) => b.isRunning);
    if (running !== undefined) {
        return running;
    }
    // noUncheckedIndexedAccess: reduce instead of index access
    return bars.reduce((best, bar) =>
        bar.levelOrder > best.levelOrder ? bar : best,
    );
}

/** Internal record produced during the grouping pass. */
interface GroupEntry {
    representative: BarWithLag;
    group: BarWithLag[];
    /** min(bar.startedAt) across the trainee's group — the moment the trainee joined the run. */
    runStartMs: number;
}

/**
 * Builds the fully-resolved comparator between GroupEntry objects, with
 * direction already baked in. The returned function is ready to pass to
 * `Array.prototype.sort` directly.
 *
 * Score and lag comparators receive direction explicitly so they can keep
 * null/unknown values at the tail regardless of direction.
 * Name, level-order, and run-start comparators receive direction at the call
 * site via `applyDirection` (they have no special null semantics).
 */
function buildCriterionComparator(
    criterion: SortCriterion,
    direction: SortDirection,
): (a: GroupEntry, b: GroupEntry) => number {
    switch (criterion) {
        case 'TRAINEE_NAME':
            return (a, b) => applyDirection(compareByName(a.representative, b.representative), direction);
        case 'CURRENT_LEVEL_ORDER':
            return (a, b) => applyDirection(compareByLevelOrder(a.representative, b.representative), direction);
        case 'CURRENT_SCORE':
            return (a, b) => compareByScore(a.representative, b.representative, direction);
        case 'LAG_TIME':
            return (a, b) => compareByLagTime(a.representative, b.representative, direction);
        case 'LAG_PERCENTAGE':
            return (a, b) => compareByLagPercentage(a.representative, b.representative, direction);
        case 'TRAINING_RUN_START':
            return (a, b) => applyDirection(compareByRunStart(a.runStartMs, b.runStartMs), direction);
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Three-stage stable ordering of `BarWithLag[]`.
 *
 * Bars are grouped by trainee identity before sorting so that each
 * trainee's full sequence of bars stays continuous on the chart — each
 * trainee is one Y-row; splitting that row across positions would be
 * incoherent. Within each trainee group, bar order is preserved from
 * the input (level order ascending from the lag-classification step).
 *
 * Stages:
 *   1. Alphabetical base by trainee display name (`user.name`).
 *   2. Primary criterion (`criterion`) in the chosen `direction`.
 *      Comparators operate on a single representative bar per trainee
 *      (the running bar, or the highest-levelOrder bar if none is running).
 *   3. Favourites-first stable partition — favourited trainees float to
 *      the top while preserving their relative order from stage 2.
 *
 * Direction semantics for lag criteria:
 *   ASC = least-behind first (lowest lagMs / lagPercentage on top).
 *   DESC = most-behind first (highest lagMs / lagPercentage on top).
 *
 * @param bars       Lag-classified bar list from `withLagState`.
 * @param criterion  Which attribute drives the primary sort.
 * @param direction  Sort direction applied to the primary criterion only.
 * @param favourites Set of trainee IDs that should float to the top.
 * @returns A new array — input is not mutated.
 */
export function applyOrdered(
    bars: readonly BarWithLag[],
    criterion: SortCriterion,
    direction: SortDirection,
    favourites: ReadonlySet<TraineeId>,
): BarWithLag[] {
    if (bars.length === 0) {
        return [];
    }

    // --- Stage 1: group bars by trainee, sort groups alphabetically --------

    const groupMap = new Map<TraineeId, BarWithLag[]>();
    for (const bar of bars) {
        const tid = asTraineeId(bar.user.id);
        const existing = groupMap.get(tid);
        if (existing !== undefined) {
            existing.push(bar);
        } else {
            groupMap.set(tid, [bar]);
        }
    }

    // Extract groups as GroupEntry records.
    // runStartMs = min(startedAt) across the group = when the trainee joined the run.
    // Stage-1 stable sort: alphabetical by display name.
    const groups: GroupEntry[] = [];
    for (const group of groupMap.values()) {
        const runStartMs = group.reduce(
            (min, bar) => (bar.startedAt < min ? bar.startedAt : min),
            Infinity,
        );
        groups.push({ representative: pickRepresentative(group), group, runStartMs });
    }

    groups.sort((a, b) => compareByName(a.representative, b.representative));

    // --- Stage 2: primary criterion sort (stable — V8 Array.sort is stable) -

    const criterionComparator = buildCriterionComparator(criterion, direction);
    groups.sort((a, b) => criterionComparator(a, b));

    // --- Stage 3: favourites-first stable partition -------------------------

    const favourited: typeof groups = [];
    const unfavourited: typeof groups = [];
    for (const entry of groups) {
        const tid = asTraineeId(entry.representative.user.id);
        if (favourites.has(tid)) {
            favourited.push(entry);
        } else {
            unfavourited.push(entry);
        }
    }

    // Flatten groups preserving internal bar order
    const result: BarWithLag[] = [];
    for (const entry of [...favourited, ...unfavourited]) {
        for (const bar of entry.group) {
            result.push(bar);
        }
    }

    return result;
}
