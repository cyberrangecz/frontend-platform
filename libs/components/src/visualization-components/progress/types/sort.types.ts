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

export const SORT_CRITERIA: readonly SortCriterion[] = [
    'TRAINEE_NAME',
    'CURRENT_LEVEL_ORDER',
    'CURRENT_SCORE',
    'LAG_TIME',
    'LAG_PERCENTAGE',
    'TRAINING_RUN_START',
] as const;

export type SortDirection = 'ASC' | 'DESC';
