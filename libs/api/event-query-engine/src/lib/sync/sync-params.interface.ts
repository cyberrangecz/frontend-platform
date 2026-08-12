import { PlatformEventType } from '@crczp/training-model';

/**
 * Parameters for a single sync cycle.
 *
 * The caller declares which event types to sync for a given instance.
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
}
