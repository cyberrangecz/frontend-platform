import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DataBrokerService, EntityResolverService } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { BarRow } from '../types/bar.types';
import { InstanceId } from '../types/ids.types';

/**
 * Broker event types the bars source declares interest in.
 *
 * The broker syncs these tables on the polling cadence. The bars cache query
 * left-joins them via the natural composite of training-run plus level so
 * each emitted row carries the three timestamp fields needed to resolve the
 * bar's effective right edge.
 */
export const BARS_EVENT_TYPES: readonly PlatformEventType[] = [
    PlatformEventType.LEVEL_STARTED,
    PlatformEventType.LEVEL_COMPLETED,
    PlatformEventType.TRAINING_RUN_ENDED,
] as const;

/**
 * Dependencies for the bars source factory.
 *
 *  - `instanceId`: reactive scope. On change the inner stream is torn down
 *    and a new sync cycle begins.
 *  - `broker`: orchestrates sync + cache query. See `@crczp/event-query-engine`.
 *  - `resolver`: post-pipe operator that resolves `user_ref_id` columns into
 *    `TrainingUser` entities via the entity registry.
 *  - `liveness$`: emits `false` when the instance is past-ended; the inner
 *    observable is gated via `takeUntil` so polling stops cleanly.
 */
export interface BarsSourceDeps {
    readonly instanceId: Signal<InstanceId>;
    readonly broker: DataBrokerService;
    readonly resolver: EntityResolverService;
    readonly liveness$: Observable<boolean>;
}

/**
 * Builds the bars reactive accessor.
 *
 * Wires `broker.queryPolling(BARS_EVENT_TYPES, barsQueryFn)` through the
 * resolver pipe, gates with `takeUntil(liveness$.pipe(filter(live => !live)))`,
 * and bridges into a signal at the boundary via `toSignal`.
 *
 * The returned signal emits an empty array until the first poll cycle
 * completes and stays referentially stable when consecutive cycles return
 * structurally identical rows.
 */
export function createBarsSource(_deps: BarsSourceDeps): Signal<readonly BarRow[]> {
    throw new Error('not implemented');
}
