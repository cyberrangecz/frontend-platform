/**
 * Answer of cancelling an allocation or cleanup request.
 */
export class StopPendingResult {
    /** True when the stop was sent but its end is not confirmed yet. */
    stopPending!: boolean;
}
