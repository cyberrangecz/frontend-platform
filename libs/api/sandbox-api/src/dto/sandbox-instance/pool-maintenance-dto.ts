/**
 * Result of requesting the cleanup of several allocation units of a pool
 */
export interface PoolCleanupResultDTO {
    /** Units left alone because their allocation is queued or its first stage is running */
    skipped_unit_ids?: number[];
}

export interface CancelledCountDTO {
    cancelled_count: number;
}

export interface ForceCancelledCountDTO {
    force_cancelled_count: number;
}

export interface ForceCleanedCountDTO {
    force_cleaned_count: number;
}
