import { BarWithLag } from '../types/bar.types';
import { LagState } from '../types/lag-state.types';

/**
 * Excludes bars by two orthogonal predicates:
 *
 *  - When `selectedLevelOrder` is non-null, keep only bars whose trainee
 *    is currently on that level. "Currently on level L" means the bar's
 *    level order matches `L` and the bar has neither a completion nor a
 *    run-end timestamp.
 *
 *    The predicate is trainee-scoped: if any of a trainee's bars matches,
 *    all bars for that trainee pass through. If none of their bars match,
 *    all bars for that trainee are excluded.
 *
 *  - When `lagFilter` is non-empty, the lag predicate is row-scoped. For
 *    each trainee, the current-state set is derived from the lag states of
 *    their running bars; trainees with no running bar receive the synthetic
 *    state set `{'COMPLETED'}`. A trainee row is excluded iff every member
 *    of their current-state set is in `lagFilter`. When at least one member
 *    is not in `lagFilter`, all bars for that trainee pass through (subject
 *    to the level predicate). An empty `lagFilter` passes all rows through.
 *
 * Both predicates compose multiplicatively; a trainee row must pass both to
 * be included.
 *
 * Returns the input reference unchanged when both predicates are no-ops
 * (`selectedLevelOrder === null` and `lagFilter.size === 0`).
 */
export function filtered(
    bars: readonly BarWithLag[],
    selectedLevelOrder: number | null,
    lagFilter: ReadonlySet<LagState>,
): readonly BarWithLag[] {
    const levelFilterActive = selectedLevelOrder !== null;
    const lagFilterActive = lagFilter.size > 0;

    // Fast path: both predicates are no-ops — return the same reference.
    if (!levelFilterActive && !lagFilterActive) {
        return bars;
    }

    // Pre-compute the set of trainee user IDs that have at least one in-progress
    // bar on the selected level. Grouped by `user.id` because `BarWithLag` does
    // not carry a branded `TraineeId` — that projection happens downstream in
    // `BarVm`. We use a plain `Set<number>` here; it is internal and not exported.
    let qualifyingUserIds: Set<number> | null = null;
    if (levelFilterActive) {
        qualifyingUserIds = new Set<number>();
        for (const bar of bars) {
            if (bar.levelOrder === selectedLevelOrder && bar.isRunning) {
                qualifyingUserIds.add(bar.user.id);
            }
        }
    }

    // Build per-user current-state sets for the row-scoped lag predicate.
    // A single pass collects the running lag states for each user. Users with
    // no running bar are not present in the map and fall back to {'COMPLETED'}.
    let userCurrentStates: Map<number, Set<LagState>> | null = null;
    if (lagFilterActive) {
        userCurrentStates = new Map<number, Set<LagState>>();
        for (const bar of bars) {
            if (bar.isRunning) {
                let stateSet = userCurrentStates.get(bar.user.id);
                if (stateSet === undefined) {
                    stateSet = new Set<LagState>();
                    userCurrentStates.set(bar.user.id, stateSet);
                }
                stateSet.add(bar.lagState);
            }
        }
    }

    return bars.filter((bar) => {
        if (levelFilterActive && !qualifyingUserIds!.has(bar.user.id)) {
            return false;
        }
        if (lagFilterActive) {
            const stateSet = userCurrentStates!.get(bar.user.id);
            // Users with no running bar have current-state set {'COMPLETED'}.
            if (stateSet === undefined) {
                return !lagFilter.has('COMPLETED');
            }
            // Exclude the row iff every member of its current-state set is filtered out.
            let allFiltered = true;
            for (const state of stateSet) {
                if (!lagFilter.has(state)) {
                    allFiltered = false;
                    break;
                }
            }
            if (allFiltered) {
                return false;
            }
        }
        return true;
    });
}
