/** Timing fields of a raw run row from which an elapsed duration is derived. */
export interface RunWindow {
    /** Run-started timestamp, in milliseconds. */
    readonly startTimestamp: number;
    /** Recorded start timestamp of the run-ended event, in milliseconds, or null while running. */
    readonly endStartTime: number | null;
    /** Recorded end timestamp of the run-ended event, in milliseconds, or null while running. */
    readonly endEndTime: number | null;
    /** Whether a run-ended event has been observed for this run. */
    readonly hasEndedRow: boolean;
}

/**
 * Elapsed run duration in milliseconds, capped so a run never extends past the instance end.
 * The end is clamped to the instance end when it is known, the start is subtracted, and the
 * result is floored at zero.
 *
 * @param startMs Run start timestamp, in milliseconds.
 * @param endMs Run end timestamp, in milliseconds, before capping.
 * @param instanceEndMs Instance end timestamp in milliseconds, or null when it has not resolved yet.
 * @returns The capped duration in milliseconds, never negative.
 */
export function cappedRunDurationMs(startMs: number, endMs: number, instanceEndMs: number | null): number {
    const cappedEndMs = instanceEndMs === null ? endMs : Math.min(endMs, instanceEndMs);
    return Math.max(0, cappedEndMs - startMs);
}

/**
 * Capped elapsed duration of a run in milliseconds. A finished run with both recorded ended
 * timestamps spans those timestamps; any other run spans its start to the current clock. The
 * result is capped to the instance end via {@link cappedRunDurationMs}.
 *
 * @param window Timing fields of the run row.
 * @param nowMs Current clock value in milliseconds, used as the end of a running run.
 * @param instanceEndMs Instance end timestamp in milliseconds, or null when it has not resolved yet.
 * @returns The capped duration in milliseconds, never negative.
 */
export function runDurationMs(window: RunWindow, nowMs: number, instanceEndMs: number | null): number {
    if (window.hasEndedRow && window.endStartTime !== null && window.endEndTime !== null) {
        return cappedRunDurationMs(window.endStartTime, window.endEndTime, instanceEndMs);
    }
    return cappedRunDurationMs(window.startTimestamp, nowMs, instanceEndMs);
}
