import { TraineeId } from './ids.types';

/**
 * Sort vocabulary for the trainee list.
 *
 * Ordering composes a three-stage stable chain:
 *   1. alphabetical by trainee name (base)
 *   2. primary criterion (`SortCriterion`) in the chosen direction
 *   3. favourites-first stable partition
 *
 * The comparators per criterion live as private helpers next to
 * `selectors/ordered.ts`.
 */
export type SortCriterion =
    | 'TRAINEE_NAME'
    | 'CURRENT_LEVEL_ORDER'
    | 'CURRENT_SCORE'
    | 'LAG_TIME'
    | 'LAG_PERCENTAGE'
    | 'TRAINING_RUN_START';

export const SORT_CRITERIA = [
    'TRAINEE_NAME',
    'CURRENT_LEVEL_ORDER',
    'CURRENT_SCORE',
    'LAG_TIME',
    'LAG_PERCENTAGE',
    'TRAINING_RUN_START',
] as const satisfies readonly SortCriterion[];

/** Default sort criterion used when no preference is persisted. */
export const DEFAULT_SORT_CRITERION: SortCriterion = SORT_CRITERIA[0];

export type SortDirection = 'ASC' | 'DESC';

/**
 * X-axis scale vocabulary.
 *
 *  - `absolute` — shared wall-clock timeline; every row plotted at its real
 *    epoch instant.
 *  - `duration` — each row re-anchored to its own run-start (`t=0`); the axis
 *    reads elapsed time so runs compare by length regardless of start time.
 */
export type AxisMode = 'absolute' | 'duration';

export const AXIS_MODES = ['absolute', 'duration'] as const satisfies readonly AxisMode[];

/** Default X-axis scale used when no preference is persisted. */
export const DEFAULT_AXIS_MODE: AxisMode = 'absolute';

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
