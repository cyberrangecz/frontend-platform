import { BarWithLag } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { BarKey } from '../types/ids.types';

/**
 * Buckets events under the bar they decorate, keyed by the natural
 * composite (training-run plus level).
 *
 * Events whose `key` does not match any bar in the filtered list are
 * dropped — overlay icons only make sense on a visible bar.
 *
 * Within each bucket, events are sorted by timestamp ascending so the
 * per-bar overlay paints deterministically.
 */
export function groupEvents(
    _events: readonly EventRow[],
    _filteredBars: readonly BarWithLag[],
): ReadonlyMap<BarKey, readonly EventRow[]> {
    throw new Error('not implemented');
}
