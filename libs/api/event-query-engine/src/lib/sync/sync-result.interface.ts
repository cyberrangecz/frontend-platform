import { PlatformEventType } from '@crczp/training-model';

/**
 * Emitted once per event type that completes within a sync cycle.
 *
 * Emitted regardless of whether a fetch occurred or was skipped due to
 * watermark freshness. This guarantees a consistent stream shape —
 * consumers can track per-type completion without special-casing skips.
 */
export interface SyncTableComplete {
    /** The event type that finished syncing. */
    eventType: PlatformEventType;
    /** Training instance this sync cycle is scoped to. */
    instanceId: number;
}
