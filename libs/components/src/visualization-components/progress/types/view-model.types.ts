// Canonical home for all view-model slice types. Do not duplicate declarations in sibling files.
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { BarVm } from './bar.types';
import { EventVm } from './event.types';
import { BarKey, LevelId, TraineeId } from './ids.types';
import { LagState } from './lag-state.types';
import { HighlightVm } from './ui-state.types';

/**
 * Axis view-model slice.
 *
 * Y-axis row count is implied by `trainees.length` on the live view-model;
 * the axis VM carries only
 * the X-axis bounds, the date-prefix toggle that controls whether the
 * label format includes the day prefix when the instance spans midnight,
 * and the mount-time snapshot that anchors engine-driven motion.
 *
 * `mountNowMs` is the wall-clock timestamp sampled when the view-model is
 * assembled. Bar right-edge growth and the current-time marker use it as
 * the `percent: 0` anchor of a single linear keyframe animation that runs
 * in real time to `endMs` — so the engine's RAF loop owns visual
 * progression between view-model emits.
 */
export interface AxisVm {
    readonly startMs: number;
    readonly endMs: number;
    readonly mountNowMs: number;
    readonly spansMidnight: boolean;
}

/**
 * Per-trainee view-model slice. One entry per visible trainee row in the
 * order they appear top-to-bottom on the Y-axis.
 *
 * The avatar dataURL arrives base64-encoded; the option-builder is responsible
 * for prepending the `data:image/png;base64,` prefix if missing.
 */
export interface TraineeVm {
    readonly id: TraineeId;
    readonly rowIndex: number;
    readonly displayName: string;
    readonly avatarDataUrl: string;
    readonly isFavourited: boolean;
}

/**
 * Per-stepper-row view-model slice. One entry per level in level order.
 *
 * The active-trainee count reflects the unfiltered instance population —
 * stepper is a navigation control showing the whole picture, not the
 * currently filtered subset.
 */
export interface StepperItemVm {
    readonly levelId: LevelId;
    readonly order: number;
    readonly type: AbstractLevelTypeEnum;
    readonly title: string;
    readonly activeTraineeCount: number;
    /**
     * True when no bar exists for this level in the unfiltered instance
     * population — no training run has started or completed the level.
     */
    readonly locked: boolean;
}

/**
 * Per-lag-state legend entry. One entry per filterable lag state.
 *
 * `label` is the human-readable text shown in the legend chip
 * (e.g. "On Track (3)"). `count` is supplied separately so the builder
 * can compose the chip without re-parsing the label.
 */
export interface LegendItemVm {
    readonly state: LagState;
    readonly label: string;
    readonly count: number;
}

/**
 * Future legend-count transition event, derived from the pre-filter
 * classified bar set. At `atMs` the legend chip for `fromState` decrements
 * by one and the chip for `toState` increments by one.
 *
 * Pre-filter on purpose: the legend is documented to reflect the whole
 * instance population, not the visible subset. Filtering applies to the
 * bars rendered in the chart, not to chip counts.
 *
 * Consumed by the live-view-model's `LegendTransitionSchedulerService`,
 * which drives a partial `setOption` dispatch at each `atMs` to refresh
 * chip text without disturbing the bars series animations.
 */
export interface LegendTransitionEventVm {
    readonly atMs: number;
    readonly fromState: LagState;
    readonly toState: LagState;
}

/**
 * Fully-resolved view-model for the live chart.
 *
 * Composed from per-feature slice types. Each slice should preserve a stable
 * reference when its upstream inputs do not change — this is what drives the
 * renderer's minimal-payload mechanism (reference equality per slice).
 */
export interface LiveViewModel {
    readonly mode: 'live';
    readonly axis: AxisVm;
    readonly bars: readonly BarVm[];
    readonly eventsByBar: ReadonlyMap<BarKey, readonly EventVm[]>;
    readonly trainees: readonly TraineeVm[];
    readonly stepper: readonly StepperItemVm[];
    readonly legend: readonly LegendItemVm[];
    /**
     * Future legend-count transitions across the *pre-filter* classified
     * bar set, ordered ascending by `atMs`. The renderer's scheduler
     * consumes this to dispatch partial legend `setOption` payloads as
     * bars cross lag-state thresholds — independently of the filtered
     * `bars` slice rendered in the chart.
     *
     * Empty when the instance has no running bars with future crossings.
     */
    readonly legendTransitions: readonly LegendTransitionEventVm[];
    readonly highlight: HighlightVm;
}

/**
 * The single shape that crosses the source → selector → option-builder
 * boundary.
 */
export type ViewModel = LiveViewModel;
