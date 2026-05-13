import { BarRow, BarWithLag } from '../types/bar.types';
import { LevelId } from '../types/ids.types';
import { LevelInfo } from '../types/bar.types';

/**
 * Attaches the lag classification and the resolved effective right edge
 * to every bar row.
 *
 *  - `effectiveEnd` = `completedAt ?? runEndedAt ?? evaluationNow`
 *  - `evaluationNow` = `min(now, instanceEndMs)` (the lag clamp)
 *
 * Bars whose level has no estimate (`estimatedDurationMs === 0`) are
 * classified `UNKNOWN`. Frozen bars (completed or run-ended) carry the
 * classification computed at their effective end.
 *
 * @param bars         Source bar rows.
 * @param levelsById   Per-level metadata (estimates).
 * @param now          Current tick value, in ms.
 * @param instanceEndMs Instance end time, ms. `null` while prefetch pending.
 */
export function withLagState(
    _bars: readonly BarRow[],
    _levelsById: ReadonlyMap<LevelId, LevelInfo>,
    _now: number,
    _instanceEndMs: number | null,
): readonly BarWithLag[] {
    throw new Error('not implemented');
}
