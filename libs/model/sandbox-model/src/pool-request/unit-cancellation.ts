export type UnitCancellationAction = 'removed' | 'stopped' | 'skipped' | 'failed';

/**
 * What Cancel all allocations did to one allocation unit of a pool.
 */
export class UnitCancellation {
    unitId!: number;
    stackName!: string;
    action!: UnitCancellationAction;
    /** True when the stop was sent but its end is not confirmed yet, so no cleanup is queued. */
    stopPending!: boolean;
    /** Why the unit was skipped or failed; empty otherwise. */
    reason!: string;
}
