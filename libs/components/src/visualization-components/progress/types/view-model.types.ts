import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { BarVm } from './bar.types';
import { EventVm } from './event.types';
import { BarKey, LevelId, TraineeId } from './ids.types';
import { LagState } from './lag-state.types';
import { HighlightVm } from './ui-state.types';

/**
 * Axis view-model slice.
 *
 * Y-axis row count is implied by `trainees.length` on the live view-model
 * (or `placeholders.length` on the skeleton); the axis VM carries only
 * the X-axis bounds, the date-prefix toggle that controls whether the
 * label format includes the day prefix when the instance spans midnight,
 * and the mount-time snapshot that anchors engine-driven motion.
 *
 * `mountNowMs` is the wall-clock timestamp captured when the feed bound
 * to its instance signal. Bar right-edge growth and the current-time
 * marker use it as the `percent: 0` anchor of a single linear keyframe
 * animation that runs in real time to `endMs` — so the chart paints
 * once and the engine's RAF loop owns visual progression. Stable for
 * the lifetime of one feed binding.
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
 * Skeleton placeholder row. The chart paints a fixed number of these
 * with the documented growing-bar animation while bars source is empty.
 *
 * `startMs` defines the bar's left edge. The right edge is engine-
 * animated from `axis.mountNowMs` to `axis.endMs` in real time, so it
 * is not encoded on the row — placeholders share the axis's mount-time
 * snapshot and animate in lock-step with the current-time marker.
 */
export interface PlaceholderRowVm {
    readonly rowIndex: number;
    readonly startMs: number;
}

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
    /**
     * `false` when all training runs have finished; the marker is hidden.
     * The marker's pixel position is engine-animated from `axis.mountNowMs`
     * to `axis.endMs`, so the view-model carries no per-tick position.
     */
    readonly showCurrentTime: boolean;
    readonly highlight: HighlightVm;
}

/**
 * Bootstrap view-model. Painted while the bars source is empty.
 *
 * Carries enough information to draw plausible chrome (axes, current-time
 * marker, frame) plus a fixed list of animated placeholder rows.
 *
 * The current-time marker derives from `axis.mountNowMs` and `axis.endMs`
 * directly — its position is engine-animated, so the view-model does not
 * carry a per-tick `currentTimeMs` field. The marker is always shown in
 * skeleton mode, so a visibility toggle is also omitted.
 *
 * Trainees, events, stepper, legend, and highlight are intentionally omitted
 * — they are not yet meaningful, and synthesizing them could leak placeholder
 * data into other code paths.
 */
export interface SkeletonViewModel {
    readonly mode: 'skeleton';
    readonly axis: AxisVm;
    readonly placeholders: readonly PlaceholderRowVm[];
}

/**
 * The single shape that crosses the source → selector → option-builder
 * boundary. Discriminated by the `mode` tag.
 */
export type ViewModel = LiveViewModel | SkeletonViewModel;
