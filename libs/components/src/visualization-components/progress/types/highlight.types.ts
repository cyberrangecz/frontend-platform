import { TraineeId } from './ids.types';

/**
 * Highlight/selection slice. Rides along with the live view-model so a
 * single dispatch covers highlight-styled bars in the same payload as
 * the rest.
 *
 *  - `highlightedTrainee` — set on hover (transient). `null` when none.
 *  - `selectedLevelOrder` — set on stepper click (persistent filter).
 *    `null` when no level is selected.
 *  - `highlightedLevelOrder` — set on stepper hover (transient dim).
 *    `null` when none.
 */
export interface HighlightVm {
    readonly highlightedTrainee: TraineeId | null;
    readonly selectedLevelOrder: number | null;
    readonly highlightedLevelOrder: number | null;
}
