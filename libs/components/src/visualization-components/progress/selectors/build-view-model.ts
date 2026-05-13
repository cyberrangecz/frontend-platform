import { TrainingInstance } from '@crczp/training-model';
import { BarRow, BarWithLag, LevelInfo } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { LevelId, TraineeId } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import { HighlightVm, SortCriterion, SortDirection } from '../types/ui-state.types';
import { LiveViewModel } from '../types/view-model.types';

/**
 * Inputs to the live view-model assembler. Every slice the assembler
 * needs is named explicitly so the caller's `computed()` graph stays
 * legible and the function stays trivially testable.
 *
 * The two intermediate selectors `withLagState → ordered` are pre-applied
 * upstream of this call; this function takes the already-classified,
 * already-ordered bars and threads them through filtering, grouping,
 * stepper counts, legend counts, and trainee derivation before composing
 * the envelope.
 *
 * The instance is required for axis bounds. `levelOrder` is the ordered
 * list of `LevelId` for stepper iteration.
 */
export interface BuildViewModelInput {
    readonly bars: readonly BarRow[];
    readonly classified: readonly BarWithLag[];
    readonly events: readonly EventRow[];
    readonly instance: TrainingInstance;
    readonly levelsById: ReadonlyMap<LevelId, LevelInfo>;
    readonly levelOrder: readonly LevelId[];
    readonly now: number;
    readonly criterion: SortCriterion;
    readonly direction: SortDirection;
    readonly favorites: ReadonlySet<TraineeId>;
    readonly selectedLevelOrder: number | null;
    readonly lagFilter: ReadonlySet<LagState>;
    readonly highlight: HighlightVm;
}

/**
 * Composes the `LiveViewModel` envelope from upstream selector outputs.
 *
 * The intermediate selectors (`filtered`, `groupEvents`, `stepperCounts`,
 * `legendCounts`, `trainees`) are invoked here in the documented order.
 * The function returns slice references that are stable when their
 * underlying inputs do not change — which lets the renderer's minimal-
 * payload mechanism detect what to dispatch.
 */
export function buildViewModel(_input: BuildViewModelInput): LiveViewModel {
    throw new Error('not implemented');
}
