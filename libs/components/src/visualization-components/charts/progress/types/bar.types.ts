import { AbstractLevelBasic, AbstractLevelTypeEnum, TrainingUser } from '@crczp/training-model';
import { BarKey, LevelId, TraineeId, TrainingRunId } from './ids.types';
import { LagState } from './lag-state.types';

/**
 * A single future lag-state crossing attached to a running bar.
 *
 * `atMs` is an absolute wall-clock timestamp (ms) at which the bar's lag
 * state will transition to `toState`. Produced by `selectors/with-lag-state.ts`
 * and consumed by the bars option-builder to drive ECharts `keyframeAnimation`
 * on `itemStyle.color` so color changes animate at the correct wall-clock
 * instant without view-model re-emission.
 */
export interface LagTransition {
    readonly atMs: number;
    readonly toState: LagState;
}

/**
 * Raw bar row as produced by the bars source (after entity resolution).
 *
 * One row per (training-run, level). All three timestamp fields are
 * present from the SQL projection. The effective right edge is resolved
 * downstream as `completedAt ?? runEndedAt ?? now`.
 *
 * The `user` field is the resolved `TrainingUser` entity. The resolver's
 * tolerant mode means it may be a fallback wrapper when resolution failed.
 */
export interface BarRow {
    readonly key: BarKey;
    readonly trainingRunId: TrainingRunId;
    readonly levelId: LevelId;
    readonly levelOrder: number;
    readonly levelType: AbstractLevelTypeEnum;
    readonly levelTitle: string;
    readonly startedAt: number;
    readonly completedAt: number | null;
    readonly runEndedAt: number | null;
    readonly scoreOnCompletion: number | null;
    readonly user: TrainingUser;
}

/**
 * Bar with the lag classification and the resolved effective right edge
 * attached. Output of `withLagState`. Downstream selectors operate on
 * this shape.
 */
export interface BarWithLag extends BarRow {
    /** Resolved per the documented precedence rule. */
    readonly effectiveEnd: number;
    /** `true` when neither completion nor run-end is set. */
    readonly isRunning: boolean;
    readonly lagState: LagState;
    /** Elapsed delay against the estimate, in ms. `null` when no estimate. */
    readonly lagMs: number | null;
    /** Delay as a percentage of the estimate. `null` when no estimate or short-mode. */
    readonly lagPercentage: number | null;
    /**
     * Future state crossings whose `atMs > mountNowMs`, ordered ascending.
     * Empty for completed bars and for bars whose level has no estimate.
     * Consumed by the renderer's imperative running-bar fill subsystem,
     * which replays the schedule against `Date.now()` to recolour each
     * fill rect at the correct wall-clock instant without view-model
     * re-emission.
     */
    readonly transitions: readonly LagTransition[];
}

/**
 * Per-bar view-model slice for the live view-model.
 *
 * Carries everything the renderer needs to draw one bar segment and its
 * level-type pill icon. Event overlays are separate (`EventVm`).
 */
export interface BarVm {
    readonly key: BarKey;
    readonly traineeId: TraineeId;
    /**
     * Resolved trainee display name from User entity. Populated by selectors
     * via entity-resolver pipe on bars source.
     */
    readonly traineeDisplayName: string;
    readonly rowIndex: number;
    readonly levelId: LevelId;
    readonly levelOrder: number;
    readonly levelType: AbstractLevelTypeEnum;
    readonly levelTitle: string;
    readonly startedAt: number;
    readonly effectiveEnd: number;
    readonly estimatedDurationMs: number | null;
    readonly scoreOnCompletion: number | null;
    readonly lagState: LagState;
    readonly isRunning: boolean;
    readonly isHighlighted: boolean;
    readonly isOtherHighlighted: boolean;
    readonly isTraineeFavourited: boolean;
    /**
     * Future lag-state crossings passed through from `BarWithLag`.
     *
     * The renderer's imperative running-bar fill subsystem replays this
     * schedule against `Date.now()` so each fill rect's colour changes at
     * the correct wall-clock instant without view-model re-emission.
     * Empty for completed bars and for bars whose level has no estimate.
     */
    readonly transitions: readonly LagTransition[];
}

/**
 * Per-level static metadata, derived from the prefetched training instance's
 * training definition. Indexed by `LevelId` in the feed service.
 *
 * Reuses the canonical `AbstractLevelBasic` shape for the identity fields
 * and replaces `estimatedDuration` (entity unit = minutes) with
 * `estimatedDurationMs` (consistent ms unit throughout the visualization).
 * Zero means "no estimate" — lag classification falls back to `OK`.
 */
export type LevelInfo = Pick<AbstractLevelBasic, 'id' | 'order' | 'type' | 'title'> & {
    readonly estimatedDurationMs: number;
};
