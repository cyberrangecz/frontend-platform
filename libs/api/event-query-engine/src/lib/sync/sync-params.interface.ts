import { PlatformEventType } from '@crczp/training-model';

/**
 * Carries the resolved parameters needed to fetch events from the
 * microservice for a single event type within a sync cycle.
 *
 * Constructed internally by CacheSyncService after watermark checks.
 * Not exposed to consumers — used to pass context between internal sync steps.
 */
export interface SyncFetchParams {
    /** Training instance being synced. */
    instanceId: number;
    /** Event type to fetch. */
    eventType: PlatformEventType;
    /**
     * Epoch millisecond timestamp. Fetch events where
     * `event.timestamp > sinceTimestamp`.
     * Derived from the watermark's maxTimestamp for this (instance, type)
     * pair, or 0 if no watermark exists (full fetch).
     */
    sinceTimestamp: number;
    /**
     * Pool ID for pool-scoped event types (Command).
     * Null for instance-scoped event types — no pool index needed.
     */
    poolId: number | null;
}

/**
 * Parameters for a single sync cycle.
 *
 * The caller declares which event types to sync for a given instance.
 * When pool-scoped event types (Command) are declared, the caller must
 * provide `poolId` — Sync does not resolve it internally. For
 * instance-scoped event types only, `poolId` can be omitted.
 */
export interface SyncParams {
    /** Training instance to sync event data for. */
    instanceId: number;
    /**
     * Event types to fetch and insert into the cache.
     * Each type results in one SyncTableComplete emission. Types are synced
     * concurrently, so emissions arrive in completion order — not necessarily
     * the order of this array. Consumers key off the emitted eventType.
     */
    eventTypes: PlatformEventType[];
    /**
     * Pool ID required when eventTypes include pool-scoped types (Command).
     * Used to target the pool-level OpenSearch index.
     * If absent when Command is declared, Sync errors immediately (fail fast).
     * Optional for instance-scoped event types only.
     */
    poolId?: number;
}
