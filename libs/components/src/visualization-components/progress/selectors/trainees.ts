import { BarWithLag } from '../types/bar.types';
import { TraineeId } from '../types/ids.types';
import { TraineeVm } from '../types/trainee.types';

/**
 * Reduces ordered bars to the Y-axis row list — one entry per distinct
 * trainee, in the order their bars appear.
 *
 * Trainee identity is read from the bar's resolved `user` field. The
 * favourited flag is sourced from the favorites set. Avatar dataURL
 * passes through as-is; the option-builder is responsible for the
 * `data:image/png;base64,` prefix coercion.
 */
export function trainees(
    _orderedBars: readonly BarWithLag[],
    _favorites: ReadonlySet<TraineeId>,
): readonly TraineeVm[] {
    throw new Error('not implemented');
}
