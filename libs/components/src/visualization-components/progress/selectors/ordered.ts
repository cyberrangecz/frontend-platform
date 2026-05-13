import { BarWithLag } from '../types/bar.types';
import { TraineeId } from '../types/ids.types';
import { SortCriterion, SortDirection } from '../types/sort.types';

/**
 * Three-stage stable ordering:
 *
 *   1. alphabetical by trainee display name (base order)
 *   2. primary criterion in the chosen direction
 *   3. favourites-first stable partition
 *
 * Stability is required so trainees with equal primary keys remain in
 * alphabetical order, and favourited trainees remain in their
 * criterion-ordered position within the favourites block.
 *
 * Bars are grouped by trainee identity for sorting; each trainee's full
 * sequence of bars is treated as one comparison unit so a trainee's
 * row stays continuous on the chart.
 */
export function ordered(
    _bars: readonly BarWithLag[],
    _criterion: SortCriterion,
    _direction: SortDirection,
    _favorites: ReadonlySet<TraineeId>,
): readonly BarWithLag[] {
    throw new Error('not implemented');
}
