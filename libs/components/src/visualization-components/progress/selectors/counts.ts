import { BarRow, BarWithLag, LevelInfo } from '../types/bar.types';
import { LevelId, TraineeId } from '../types/ids.types';
import { LegendItemVm, StepperItemVm, TraineeVm } from '../types/view-model.types';

/**
 * Counts bars per lag-state value for the legend.
 *
 * Counts the population of the supplied bar list — the caller decides
 * whether to pass the full classified list (whole-population counts) or
 * the post-filter list (visible-population counts). Spec leaves the
 * choice as a code-phase tweak; the function itself is agnostic.
 *
 * Only the legend-filterable subset of lag states (`LAG_STATES_FILTERABLE`)
 * appears in the output, in canonical order.
 */
export function legendCounts(_bars: readonly BarWithLag[]): readonly LegendItemVm[] {
    throw new Error('not implemented');
}

/**
 * Counts active training-runs per level for the stepper.
 *
 * Reads the unfiltered source-level bar list intentionally — stepper counts
 * reflect the entire instance population, not the currently filtered view.
 *
 * For each level (in level order), counts distinct `trainingRunId` values
 * whose latest bar on that level has both `completedAt` and `runEndedAt`
 * absent.
 */
export function stepperCounts(
    _bars: readonly BarRow[],
    _levelsById: ReadonlyMap<LevelId, LevelInfo>,
    _levelOrder: readonly LevelId[],
): readonly StepperItemVm[] {
    throw new Error('not implemented');
}

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
