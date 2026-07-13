import { LAG_STATE_LABELS } from '../config/lag.config';
import { BarWithLag } from '../types/bar.types';
import { LAG_STATES_FILTERABLE, LagState } from '../types/lag-state.types';
import { LegendItemVm } from '../types/view-model.types';

/**
 * Counts the current running population per filterable lag-state for the legend.
 *
 * **Pre-filter counts (pinned decision):** This function receives the
 * post-classification, pre-filter bar list (`laggedBars`) so the legend
 * always reflects the *whole instance population*, not the currently
 * visible subset.
 *
 * Lag chips (OK / WARNING / LATE / ABANDONED): count only bars whose
 * `isRunning` is `true`, grouped by their `lagState`. Bars that are not
 * running do not contribute to these chips.
 *
 * COMPLETED chip: count of distinct trainee user IDs that have at least
 * one bar and zero running bars. A trainee row with every level finished
 * or terminated but none currently running is counted once toward COMPLETED.
 *
 * Output is one {@link LegendItemVm} per state in {@link LAG_STATES_FILTERABLE}
 * order (COMPLETED → OK → WARNING → LATE → ABANDONED). The two INACTIVE
 * variants are visual-only and are excluded from the output.
 */
export function buildLegendCounts(laggedBars: readonly BarWithLag[]): readonly LegendItemVm[] {
    const runningCounts = new Map<LagState, number>();
    const allUserIds = new Set<number>();
    const runningUserIds = new Set<number>();

    for (const bar of laggedBars) {
        allUserIds.add(bar.user.id);
        if (bar.isRunning) {
            runningUserIds.add(bar.user.id);
            const current = runningCounts.get(bar.lagState) ?? 0;
            runningCounts.set(bar.lagState, current + 1);
        }
    }

    let completedCount = 0;
    for (const userId of allUserIds) {
        if (!runningUserIds.has(userId)) {
            completedCount++;
        }
    }

    return LAG_STATES_FILTERABLE.map(
        (state): LegendItemVm => ({
            state,
            label: LAG_STATE_LABELS[state],
            count: state === 'COMPLETED' ? completedCount : (runningCounts.get(state) ?? 0),
        }),
    );
}
