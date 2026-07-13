import { BarWithLag } from '../types/bar.types';
import { LagState } from '../types/lag-state.types';
import { LegendTransitionEventVm } from '../types/view-model.types';

/**
 * Flattens every classified bar's future-transition list into a unified,
 * ascending event timeline suitable for the legend-transition scheduler.
 *
 * Each emitted event carries both the source and target state so the
 * scheduler can decrement the source chip count and increment the target
 * chip count at `atMs`. The source state of a bar's first future
 * transition is its current `lagState` (the count this bar already
 * contributes to in the initial legend); subsequent transitions chain
 * from the prior target.
 *
 * **Pre-filter input.** Like {@link buildLegendCounts}, this selector is
 * fed the post-classification, pre-filter bar list so the legend always
 * reflects the *whole instance population* — filtering applies to the
 * bars drawn on the chart, never to the chip counts.
 *
 * Transitions with `atMs <= mountNowMs` are dropped; they are already
 * reflected in the initial legend counts.
 *
 * @param classified - Pre-filter, classified bars.
 * @param mountNowMs - Wall-clock anchor; events at or before this instant
 *                    are excluded as already-applied history.
 * @returns Ascending timeline of legend-count transitions. Empty when no
 *          bars have future crossings.
 */
export function buildLegendTransitionSchedule(
    classified: readonly BarWithLag[],
    mountNowMs: number,
): readonly LegendTransitionEventVm[] {
    const events: LegendTransitionEventVm[] = [];
    for (const bar of classified) {
        let fromState: LagState = bar.lagState;
        for (const transition of bar.transitions) {
            if (transition.atMs <= mountNowMs) {
                // Already-applied crossing — fold into the source state so
                // chained transitions still pair correctly.
                fromState = transition.toState;
                continue;
            }
            events.push({
                atMs: transition.atMs,
                fromState,
                toState: transition.toState,
            });
            fromState = transition.toState;
        }
    }
    events.sort((a, b) => a.atMs - b.atMs);
    return events;
}
