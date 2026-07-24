import { EventRow, EventVm } from '../types/event.types';
import { BarKey } from '../types/ids.types';
import { BarWithLag } from '../types/bar.types';

/**
 * Shared empty map returned whenever the result would be empty.
 *
 * Keeps the reference stable across re-evaluations, avoiding unnecessary
 * downstream recalculations when no events match the current filter.
 */
const EMPTY_MAP: ReadonlyMap<BarKey, readonly EventVm[]> = new Map();

/**
 * Buckets events under the bar they decorate, projected to `EventVm`, keyed
 * by the natural composite (training-run plus level).
 *
 * Events whose `key` does not match any bar in the filtered list are dropped —
 * overlay icons only make sense on a visible bar.
 *
 * Within each bucket, events are sorted by timestamp ascending so the per-bar
 * overlay painting is deterministic.
 *
 * `rowIndex` on each `EventVm` is the Y-axis index of the trainee that owns
 * the bar. It is derived from the first-occurrence order of each trainee
 * (by `user.id`) across `filteredBars`, matching the derivation performed by
 * the `trainees` selector on the same input.
 *
 * Events whose `key` does not match any bar in the filtered list are dropped —
 * overlay icons only make sense on a visible bar.
 */
export function groupEventsByBar(
    events: readonly EventRow[],
    filteredBars: readonly BarWithLag[],
): ReadonlyMap<BarKey, readonly EventVm[]> {
    if (events.length === 0 || filteredBars.length === 0) {
        return EMPTY_MAP;
    }

    // Build two lookup structures from filteredBars in a single pass:
    //   rowByUserId — first-occurrence Y-axis index per trainee (user.id → rowIndex)
    //   rowByBarKey — BarKey → rowIndex for the event-matching step
    const rowByUserId = new Map<number, number>();
    const rowByBarKey = new Map<BarKey, number>();

    for (const bar of filteredBars) {
        if (!rowByUserId.has(bar.user.id)) {
            rowByUserId.set(bar.user.id, rowByUserId.size);
        }
        const rowIndex = rowByUserId.get(bar.user.id) as number;
        rowByBarKey.set(bar.key, rowIndex);
    }

    // Sort events globally by timestamp ASC — bucket insertion preserves order,
    // so per-bucket ascending order falls out for free without per-bucket sorts.
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    const result = new Map<BarKey, EventVm[]>();
    let matched = 0;

    for (const event of sorted) {
        const rowIndex = rowByBarKey.get(event.key);
        if (rowIndex === undefined) {
            // Event does not align with any visible bar — drop it.
            continue;
        }
        matched++;

        let bucket = result.get(event.key);
        if (bucket === undefined) {
            bucket = [];
            result.set(event.key, bucket);
        }

        bucket.push(toEventVm(event, rowIndex));
    }

    return matched === 0 ? EMPTY_MAP : result;
}

/**
 * Projects one `EventRow` to `EventVm`.
 *
 * `detail` carries the event-specific text shown under the tooltip kind
 * header: the answer for answer events, the hint title for hints. Kinds
 * with no detail beyond their label resolve to an empty string.
 */
function toEventVm(event: EventRow, rowIndex: number): EventVm {
    return {
        kind: event.kind,
        rowIndex,
        timestamp: event.timestamp,
        detail: resolveDetail(event),
    };
}

/**
 * Resolves the per-event detail line.
 *
 * @param event Source event row.
 * @returns The answer text for answer events, the hint title for hints, or
 *          an empty string for kinds that carry no detail.
 */
function resolveDetail(event: EventRow): string {
    switch (event.kind) {
        case 'WRONG_ANSWER':
        case 'CORRECT_ANSWER':
            return event.answer ?? '';
        case 'HINT_TAKEN':
            return event.hintTitle ?? '';
        default:
            return '';
    }
}
