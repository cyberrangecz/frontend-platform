/**
 * Whether a run id identifies a selected run. A run id is a positive integer; null, undefined, and
 * the zero sentinel all mean "no run selected". Narrows the value to `number` so callers can feed it
 * to run-scoped queries or comparisons without a further check.
 *
 * @param runId Run id from an input, route, or selection signal; null/undefined/0 when none is chosen.
 * @returns True when a run is selected, narrowing `runId` to `number`.
 */
export function isRunSelected(runId: number | null | undefined): runId is number {
    return runId != null && runId > 0;
}
