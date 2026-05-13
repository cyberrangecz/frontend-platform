import { AxisVm } from './axis.types';
import { BarVm } from './bar.types';
import { EventVm } from './event.types';
import { HighlightVm } from './highlight.types';
import { BarKey } from './ids.types';
import { LegendItemVm } from './legend.types';
import { StepperItemVm } from './stepper.types';
import { TraineeVm } from './trainee.types';

/**
 * Fully-resolved view-model for the live chart.
 *
 * Composed from per-feature slice types. Each slice should preserve a stable
 * reference when its upstream inputs do not change — this is what drives the
 * renderer's minimal-payload mechanism (reference equality per slice).
 *
 * The `mode` tag disambiguates this from `SkeletonViewModel` at consumption
 * sites (renderer narrows via `if (vm.mode === 'live')`).
 */
export interface LiveViewModel {
    readonly mode: 'live';
    readonly axis: AxisVm;
    readonly bars: readonly BarVm[];
    readonly eventsByBar: ReadonlyMap<BarKey, readonly EventVm[]>;
    readonly trainees: readonly TraineeVm[];
    readonly stepper: readonly StepperItemVm[];
    readonly legend: readonly LegendItemVm[];
    /** Timestamp at which the current-time marker is drawn. */
    readonly currentTimeMs: number;
    /** `false` when all training runs have finished; the marker is hidden. */
    readonly showCurrentTime: boolean;
    readonly highlight: HighlightVm;
}
