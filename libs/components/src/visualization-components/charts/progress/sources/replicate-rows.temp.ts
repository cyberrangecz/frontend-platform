import { TrainingUser } from '@crczp/training-model';
import { BarRow } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { asBarKey, asTrainingRunId, TrainingRunId } from '../types/ids.types';

/**
 * Local test scaffold: forges extra trainee rows out of the live feed so
 * multi-row layout can be exercised on an instance with few trainees.
 * Delete this file and its two call sites in `progress-feed.service.ts`
 * once the layout is verified.
 */

/**
 * Rows emitted per real trainee, the original included. `1` passes the feed
 * through untouched; `4` renders every trainee four times.
 */
export const TRAINEE_REPLICA_COUNT = 24;

/**
 * Added to a training-run id and a user id once per replica index, keeping
 * forged ids clear of the real ones they are derived from.
 */
const REPLICA_ID_STRIDE = 1_000_000;

/**
 * Offsets an id into the replica's own numbering space.
 *
 * @param original - Id carried by the real row.
 * @param replicaIndex - Zero-based replica position; zero returns the original.
 * @returns The offset id.
 */
function offsetId(original: number, replicaIndex: number): number {
    return original + replicaIndex * REPLICA_ID_STRIDE;
}

/**
 * Copies a resolved user into the replica's identity, so the replica occupies
 * its own Y-axis row and carries a distinguishable display name.
 *
 * @param user - Resolved user from the real row.
 * @param replicaIndex - Zero-based replica position.
 * @returns The forged user.
 */
function replicaUser(user: TrainingUser, replicaIndex: number): TrainingUser {
    return Object.assign(new TrainingUser(), user, {
        id: offsetId(user.id, replicaIndex),
        name: `${user.name} R${replicaIndex + 1}`,
    });
}

/**
 * Repeats every bar row under forged run and user ids.
 *
 * @param rows - Bar rows as the source emitted them.
 * @param replicaCount - Rows to emit per input row, the original included.
 * @returns The replicated bar rows, originals first.
 */
export function replicateBarRows(
    rows: readonly BarRow[],
    replicaCount: number,
): readonly BarRow[] {
    if (replicaCount <= 1) return rows;
    const replicated: BarRow[] = [];
    for (let replicaIndex = 0; replicaIndex < replicaCount; replicaIndex += 1) {
        for (const row of rows) {
            if (replicaIndex === 0) {
                replicated.push(row);
                continue;
            }
            const trainingRunId: TrainingRunId = asTrainingRunId(
                offsetId(row.trainingRunId, replicaIndex),
            );
            replicated.push({
                ...row,
                key: asBarKey(trainingRunId, row.levelId),
                trainingRunId,
                user: replicaUser(row.user, replicaIndex),
            });
        }
    }
    return replicated;
}

/**
 * Repeats every event row under the same forged run ids {@link replicateBarRows}
 * applies, so each replica's events land on that replica's bars.
 *
 * @param rows - Event rows as the source emitted them.
 * @param replicaCount - Rows to emit per input row, the original included.
 * @returns The replicated event rows, originals first.
 */
export function replicateEventRows(
    rows: readonly EventRow[],
    replicaCount: number,
): readonly EventRow[] {
    if (replicaCount <= 1) return rows;
    const replicated: EventRow[] = [];
    for (let replicaIndex = 0; replicaIndex < replicaCount; replicaIndex += 1) {
        for (const row of rows) {
            if (replicaIndex === 0) {
                replicated.push(row);
                continue;
            }
            const trainingRunId: TrainingRunId = asTrainingRunId(
                offsetId(row.trainingRunId, replicaIndex),
            );
            replicated.push({
                ...row,
                key: asBarKey(trainingRunId, row.levelId),
                trainingRunId,
            });
        }
    }
    return replicated;
}
