import { BarVm } from '../types/bar.types';
import { BarKey, TraineeId } from '../types/ids.types';
import { keepExtremumByKey } from './keep-extremum-by-key';

/**
 * Resolved run-boundary anchor for one trainee row. Carries the anchor
 * instant plus the identity and rendering state of the bar it was derived
 * from, so cap rendering can size and style the cap to its anchor bar.
 */
export interface RunAnchor {
    readonly anchorMs: number;
    readonly rowIndex: number;
    readonly barKey: BarKey;
    readonly isRunning: boolean;
    readonly lagState: BarVm['lagState'];
}

/**
 * Projects a bar into a {@link RunAnchor} at the given anchor instant, carrying
 * the bar's row, identity, and rendering state.
 *
 * @param bar The bar the anchor is derived from.
 * @param anchorMs The run-boundary instant to anchor at (the bar's start or end).
 * @returns The run anchor for the bar.
 */
export function toRunAnchor(bar: BarVm, anchorMs: number): RunAnchor {
    return {
        anchorMs,
        rowIndex: bar.rowIndex,
        barKey: bar.key,
        isRunning: bar.isRunning,
        lagState: bar.lagState,
    };
}

/**
 * Derives one start anchor per trainee: the bar with the minimum `startedAt`
 * across all bars belonging to that trainee. Each trainee occupies exactly
 * one row, so the result holds one anchor per visible row.
 *
 * @param bars All bar view-models for the current binding.
 * @returns Map from `TraineeId` to its run-start anchor.
 */
export function deriveStartAnchors(bars: readonly BarVm[]): Map<TraineeId, RunAnchor> {
    const earliestByTrainee = keepExtremumByKey(
        bars,
        (bar) => bar.traineeId,
        (candidate, incumbent) => candidate.startedAt < incumbent.startedAt,
    );

    const anchors = new Map<TraineeId, RunAnchor>();
    for (const [traineeId, bar] of earliestByTrainee) {
        anchors.set(traineeId, toRunAnchor(bar, bar.startedAt));
    }
    return anchors;
}
