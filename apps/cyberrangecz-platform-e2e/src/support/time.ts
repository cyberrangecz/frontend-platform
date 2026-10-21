export const HOUR_MILLISECONDS = 60 * 60 * 1000;
export const DAY_MILLISECONDS = 24 * HOUR_MILLISECONDS;

/** The moment the given number of milliseconds from now; a negative number reaches into the past. */
export function fromNow(milliseconds: number): Date {
    return new Date(Date.now() + milliseconds);
}

/** Longest a table may take to show the result of a filter. */
export const FILTER_SETTLE_TIMEOUT_MILLISECONDS = 10_000;
