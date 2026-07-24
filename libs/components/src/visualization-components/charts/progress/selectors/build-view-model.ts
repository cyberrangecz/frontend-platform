import { isSameDay } from 'date-fns';
import { TrainingInstanceBasic } from '@crczp/training-model';
import { BarRow, BarVm, BarWithLag, LevelInfo } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { asTraineeId, LevelId, TraineeId } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import { HighlightVm, SortCriterion, SortDirection } from '../types/ui-state.types';
import { AxisVm, LiveViewModel } from '../types/view-model.types';
import { applyOrdered } from './ordered';
import { filtered } from './filtered';
import { groupEventsByBar } from './group-events';
import { trainees } from './trainees';
import { buildLegendCounts } from './legend-counts';
import { buildLegendTransitionSchedule } from './legend-transitions';
import { stepperCounts } from './stepper-counts';
import { computeAxisWindow } from './axis-window';

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
    /**
     * All bar rows for the current feed binding. `bar.user` is always a
     * fully-resolved `TrainingUser` shape — `bars-source` normalizes the
     * tolerant-resolver fallback before emission.
     */
    readonly bars: readonly BarRow[];
    /**
     * Classified (lag-annotated) bars. Same contract as `bars`: `bar.user`
     * is always a fully-resolved `TrainingUser` — `bars-source` normalizes
     * the tolerant-resolver fallback before emission.
     */
    readonly classified: readonly BarWithLag[];
    readonly events: readonly EventRow[];
    readonly instance: TrainingInstanceBasic;
    readonly levelsById: ReadonlyMap<LevelId, LevelInfo>;
    readonly levelOrder: readonly LevelId[];
    /**
     * Wall-clock timestamp sampled when the view-model is assembled.
     * Anchors the axis's engine-driven motion law: bar right-edge growth
     * and the current-time marker are painted with a linear
     * `keyframeAnimation` from `mountNowMs` to `axis.endMs`, so the
     * renderer's RAF loop owns visual progression between view-model emits.
     */
    readonly mountNowMs: number;
    /**
     * Current wall-clock time used to compute the axis right bound.
     * Updated by the watchdog when the remaining padding drops below
     * the refresh threshold. Distinct from `mountNowMs`, which is
     * locked at bind time and drives engine motion anchoring.
     */
    readonly nowMs: number;
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
 * Assembly order is locked:
 *   1. Merge highlight-hovered trainee into the favourites set used for
 *      sort-only pinning (the real favourites set drives trainee-row flags).
 *   2. `applyOrdered` — group-aware stable sort with favourites floated.
 *   3. `filtered` — level-and-lag predicates (returns input ref on no-op).
 *   4. `groupEventsByBar`, `trainees`, `buildLegendCounts`, `stepperCounts`
 *      — independent slices, computed in any order.
 *   5. Per-bar projection to `BarVm` with first-occurrence `rowIndex`
 *      derivation matching the trainees / groupEvents contract.
 *
 * The function returns slice references that are stable when their
 * underlying inputs do not change — selectors already preserve identity
 * on no-op, and the assembler does not clone or spread them.
 */
export function buildViewModel(input: BuildViewModelInput): LiveViewModel {
    const mergedFavorites: ReadonlySet<TraineeId> =
        input.highlight.highlightedTrainee !== null
            ? new Set<TraineeId>([
                  ...input.favorites,
                  input.highlight.highlightedTrainee,
              ])
            : input.favorites;

    const orderedBars = applyOrdered(
        input.classified,
        input.criterion,
        input.direction,
        mergedFavorites,
    );

    const filteredBars = filtered(
        orderedBars,
        input.selectedLevelOrder,
        input.lagFilter,
    );

    const eventsByBar = groupEventsByBar(input.events, filteredBars);
    const traineeList = trainees(filteredBars, input.favorites);
    const legendList = buildLegendCounts(input.classified);
    const legendTransitionList = buildLegendTransitionSchedule(
        input.classified,
        input.mountNowMs,
    );
    const stepperList = stepperCounts(
        input.bars,
        input.levelsById,
        input.levelOrder,
    );

    const rowByUserId = buildRowIndexMap(filteredBars);

    const barVms: readonly BarVm[] = filteredBars.map((bar) =>
        buildBarVm(
            bar,
            rowByUserId.get(bar.user.id) ?? 0,
            input.instance,
            input.levelsById,
            input.highlight,
            input.favorites,
        ),
    );

    const axis = buildAxis(input.instance, input.events, input.nowMs, input.mountNowMs);

    return {
        mode: 'live',
        axis,
        bars: barVms,
        eventsByBar,
        trainees: traineeList,
        stepper: stepperList,
        legend: legendList,
        legendTransitions: legendTransitionList,
        highlight: input.highlight,
    };
}

/**
 * Builds the user-id → rowIndex map matching the contract used by
 * `trainees` and `groupEventsByBar`: first-occurrence position of each
 * distinct `user.id` across the filtered bar list.
 */
function buildRowIndexMap(
    filteredBars: readonly BarWithLag[],
): ReadonlyMap<number, number> {
    const rowByUserId = new Map<number, number>();
    for (const bar of filteredBars) {
        if (!rowByUserId.has(bar.user.id)) {
            rowByUserId.set(bar.user.id, rowByUserId.size);
        }
    }
    return rowByUserId;
}

/**
 * Per-bar projection. Fields are resolved against the canonical `BarVm`
 * shape; field names diverge from the spec hints (`startedAt`/`effectiveEnd`
 * rather than `startMs`/`endMs`) and match the downstream bars option-builder.
 *
 * `traineeDisplayName` reads `bar.user.name` directly — `bar.user` is always
 * a fully-resolved `TrainingUser` at this boundary.
 *
 * `isTraineeFavourited` reads the real favourites set, not the merged set
 * (the merge is sort-only and must not surface as a per-row flag).
 *
 * `isHighlighted` / `isOtherHighlighted` are mutually exclusive when
 * `highlightedLevelOrder` is non-null and both `false` when it is `null`.
 */
function buildBarVm(
    bar: BarWithLag,
    rowIndex: number,
    instance: TrainingInstanceBasic,
    levelsById: ReadonlyMap<LevelId, LevelInfo>,
    highlight: HighlightVm,
    favorites: ReadonlySet<TraineeId>,
): BarVm {
    const traineeId = asTraineeId(bar.user.id);

    const effectiveEnd =
        bar.completedAt ?? bar.runEndedAt ?? instance.endTime.getTime();

    const estimatedDurationMs =
        levelsById.get(bar.levelId)?.estimatedDurationMs ?? null;

    const traineeDisplayName = bar.user.name;

    const highlightedLevelOrder = highlight.highlightedLevelOrder;
    const isHighlighted =
        highlightedLevelOrder !== null &&
        bar.levelOrder === highlightedLevelOrder;
    const isOtherHighlighted =
        highlightedLevelOrder !== null &&
        bar.levelOrder !== highlightedLevelOrder;

    return {
        key: bar.key,
        traineeId,
        traineeDisplayName,
        rowIndex,
        levelId: bar.levelId,
        levelOrder: bar.levelOrder,
        levelType: bar.levelType,
        levelTitle: bar.levelTitle,
        startedAt: bar.startedAt,
        effectiveEnd,
        estimatedDurationMs,
        scoreOnCompletion: bar.scoreOnCompletion,
        lagState: bar.lagState,
        isRunning: bar.completedAt === null && bar.runEndedAt === null,
        isHighlighted,
        isOtherHighlighted,
        isTraineeFavourited: favorites.has(traineeId),
        transitions: bar.transitions,
    };
}

/**
 * Axis composition. Derives `startMs`/`endMs` from the data-driven window
 * formula (clamped to instance start, padded by `AXIS_PADDING_MS`) and
 * carries `mountNowMs` through unchanged for engine-driven motion anchoring.
 * `spansMidnight` is computed against the derived window boundaries.
 */
function buildAxis(
    instance: TrainingInstanceBasic,
    events: readonly EventRow[],
    nowMs: number,
    mountNowMs: number,
): AxisVm {
    const { startMs, endMs } = computeAxisWindow(
        instance.startTime.getTime(),
        events,
        nowMs,
    );
    return {
        startMs,
        endMs,
        mountNowMs,
        spansMidnight: !isSameDay(new Date(startMs), new Date(endMs)),
    };
}
