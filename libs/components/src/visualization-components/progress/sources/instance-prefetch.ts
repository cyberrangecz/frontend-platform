import { Signal } from '@angular/core';
import { LinearTrainingInstanceApi } from '@crczp/training-api';
import { TrainingInstance } from '@crczp/training-model';
import { InstanceId } from '../types/ids.types';

/**
 * Dependencies for the instance prefetch factory.
 *
 *  - `instanceId`: reactive scope. On change the existing prefetch is
 *    discarded and a new fetch is issued.
 *  - `instanceApi`: the existing direct HTTP service. Returns a full
 *    `TrainingInstance` via Cashew-cached call — remounts are free.
 */
export interface InstancePrefetchDeps {
    readonly instanceId: Signal<InstanceId>;
    readonly instanceApi: LinearTrainingInstanceApi;
}

/**
 * Builds the instance prefetch reactive accessor.
 *
 * Issues `instanceApi.get(id)` once per distinct `instanceId` value. The
 * returned signal emits `null` before the first response, then the resolved
 * `TrainingInstance` for as long as that id is the current scope.
 *
 * When the instance's training definition does not surface the per-level
 * `estimatedDuration` deeply enough for the lag classifier, the factory
 * issues a follow-up call to the training definition API and merges the
 * level list before emitting. This detail is invisible to consumers.
 */
export function createInstancePrefetch(
    _deps: InstancePrefetchDeps,
): Signal<TrainingInstance | null> {
    throw new Error('not implemented');
}
