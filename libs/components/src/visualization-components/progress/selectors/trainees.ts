import { BarWithLag } from '../types/bar.types';
import { asTraineeId, TraineeId } from '../types/ids.types';
import { TraineeVm } from '../types/view-model.types';

/**
 * Reduces filtered bars to the Y-axis row list — one entry per distinct
 * trainee, in the order their bars appear top-to-bottom.
 *
 * Iterates the post-filter, post-order bar list once. The first occurrence of
 * each trainee id determines both the row index and the display metadata. A
 * `Set<TraineeId>` tracks seen ids so subsequent bars for the same trainee
 * are skipped in O(1).
 *
 * rowIndex consistency contract: `filteredBars` must be the same list passed
 * to `groupEventsByBar`. Both selectors derive `rowIndex` from the first-
 * occurrence order of `user.id` across that list. Filtered-out trainees vanish
 * entirely from the chart Y-axis.
 *
 * Trainee identity is read from the bar's resolved `user` field:
 *   - id       → `user.id` (branded via `asTraineeId`)
 *   - name     → `user.name`
 *   - avatar   → `user.picture` (raw base64; option-builder prepends
 *                `data:image/png;base64,` before rendering)
 *
 * The favourited flag is looked up from the `favorites` set per trainee id.
 * `rowIndex` is the 0-based position in the returned array.
 */
export function trainees(
    filteredBars: readonly BarWithLag[],
    favorites: ReadonlySet<TraineeId>,
): readonly TraineeVm[] {
    const seen = new Set<TraineeId>();
    const result: TraineeVm[] = [];

    for (const bar of filteredBars) {
        const traineeId = asTraineeId(bar.user.id);
        if (seen.has(traineeId)) {
            continue;
        }
        seen.add(traineeId);
        result.push({
            id: traineeId,
            rowIndex: result.length,
            displayName: bar.user.name,
            avatarDataUrl: bar.user.picture ?? '',
            isFavourited: favorites.has(traineeId),
        });
    }

    return result;
}
