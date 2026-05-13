import { AbstractLevelBasic } from '@crczp/training-model';

/**
 * Per-level static metadata, derived from the prefetched training instance's
 * training definition. Indexed by `LevelId` in the feed service.
 *
 * Reuses the canonical `AbstractLevelBasic` shape for the identity fields
 * and replaces `estimatedDuration` (entity unit = minutes) with
 * `estimatedDurationMs` (consistent ms unit throughout the visualization).
 * Zero means "no estimate" — lag classification falls back to `UNKNOWN`.
 */
export type LevelInfo = Pick<AbstractLevelBasic, 'id' | 'order' | 'type' | 'title'> & {
    readonly estimatedDurationMs: number;
};
