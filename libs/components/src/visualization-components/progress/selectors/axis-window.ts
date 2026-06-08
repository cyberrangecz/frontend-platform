import { AXIS_PADDING_MS } from '../config/ui.config';
import { EventRow } from '../types/event.types';

/**
 * Computes the X-axis window bounds from the available data.
 *
 * Formula:
 *   startMs = min(firstEventTs, instanceStartMs) - AXIS_PADDING_MS
 *   endMs   = max(lastEventTs,  nowMs)           + AXIS_PADDING_MS
 *
 * When no events are present both ends collapse to the instance start
 * so the axis centres on a meaningful anchor even before activity begins.
 *
 * Events are assumed to be sorted ascending by timestamp (as guaranteed
 * by the events-source ORDER BY clause), so first/last timestamp lookup
 * is O(1).
 *
 * @param instanceStartMs - Instance start time in milliseconds.
 * @param events          - Raw event rows from the events source.
 * @param nowMs           - Current wall-clock time in milliseconds.
 * @returns The axis window `{ startMs, endMs }`.
 */
export function computeAxisWindow(
    instanceStartMs: number,
    events: readonly EventRow[],
    nowMs: number,
): { readonly startMs: number; readonly endMs: number } {
    const firstEventTs: number | undefined = events[0]?.timestamp;
    const lastEventTs: number | undefined = events[events.length - 1]?.timestamp;

    const windowStart =
        firstEventTs !== undefined
            ? Math.min(firstEventTs, instanceStartMs)
            : instanceStartMs;

    const windowEnd =
        lastEventTs !== undefined ? Math.max(lastEventTs, nowMs) : nowMs;

    return {
        startMs: windowStart - AXIS_PADDING_MS,
        endMs: windowEnd + AXIS_PADDING_MS,
    };
}
