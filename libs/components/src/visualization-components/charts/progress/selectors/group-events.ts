import { EventKind, EventRow, EventVm } from '../types/event.types';
import { BarKey } from '../types/ids.types';
import { BarWithLag } from '../types/bar.types';

/**
 * Human-readable label for each event kind.
 *
 * Used as `EventVm.tooltipLabel` for all non-hint events.
 * Hint rows override with `EventRow.hintTitle` when present.
 * `EVENT_ICON_CATALOG` carries no label field, so labels are declared
 * here explicitly for clarity and i18n-readiness.
 */
const KIND_LABELS: Readonly<Record<EventKind, string>> = {
    WRONG_ANSWER: 'Wrong answer',
    CORRECT_ANSWER: 'Correct answer',
    HINT_TAKEN: 'Hint taken',
    SOLUTION_DISPLAYED: 'Solution displayed',
    ASSESSMENT_ANSWERS: 'Assessment answers',
    TRAINING_RUN_STARTED: 'Training run started',
    TRAINING_RUN_RESUMED: 'Training run resumed',
    TRAINING_RUN_ENDED: 'Training run ended',
} as const;

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
 * Hint discrimination:
 *  - `HINT_TAKEN` → `tooltipLabel` is `hintTitle` when present, otherwise
 *    the generic kind label.
 *  - All other kinds → `tooltipLabel` is the kind's entry in `KIND_LABELS`.
 */
function toEventVm(event: EventRow, rowIndex: number): EventVm {
    const isHint = event.kind === 'HINT_TAKEN';

    const tooltipLabel = isHint
        ? (event.hintTitle ?? KIND_LABELS.HINT_TAKEN)
        : KIND_LABELS[event.kind];

    return {
        kind: event.kind,
        rowIndex,
        timestamp: event.timestamp,
        tooltipLabel,
    };
}
