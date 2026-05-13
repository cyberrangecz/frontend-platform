import { BarRow } from '../types/bar.types';
import { LevelId } from '../types/ids.types';
import { LevelInfo } from '../types/level.types';
import { StepperItemVm } from '../types/stepper.types';

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
