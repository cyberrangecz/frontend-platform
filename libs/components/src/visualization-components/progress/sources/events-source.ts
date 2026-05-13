import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DataBrokerService, EntityResolverService } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { EventRow } from '../types/event.types';
import { InstanceId } from '../types/ids.types';

/**
 * Broker event types the events source declares interest in.
 *
 * The union of all event kinds the chart renders as overlay icons. The
 * cache query unions the per-table results into a flat sequence tagged
 * with the discriminator column.
 */
export const EVENTS_EVENT_TYPES: readonly PlatformEventType[] = [
    PlatformEventType.WRONG_ANSWER_SUBMITTED,
    PlatformEventType.CORRECT_ANSWER_SUBMITTED,
    PlatformEventType.HINT_TAKEN,
    PlatformEventType.SOLUTION_DISPLAYED,
    PlatformEventType.ASSESSMENT_ANSWERS,
    PlatformEventType.TRAINING_RUN_STARTED,
    PlatformEventType.TRAINING_RUN_RESUMED,
    PlatformEventType.TRAINING_RUN_ENDED,
] as const;

/**
 * Dependencies for the events source factory.
 *
 *  - `instanceId`: reactive scope, same semantics as bars source.
 *  - `broker`: orchestrates sync + cache query.
 *  - `resolver`: resolves `hint_id` columns to `HintBasic` entities on
 *    the rows where they appear.
 *  - `liveness$`: liveness gate, same as bars source.
 */
export interface EventsSourceDeps {
    readonly instanceId: Signal<InstanceId>;
    readonly broker: DataBrokerService;
    readonly resolver: EntityResolverService;
    readonly liveness$: Observable<boolean>;
}

/**
 * Builds the events reactive accessor.
 *
 * Same shape as the bars source. Inner observable polls the union query,
 * pipes through the resolver, gates on liveness, and bridges into a signal.
 */
export function createEventsSource(_deps: EventsSourceDeps): Signal<readonly EventRow[]> {
    throw new Error('not implemented');
}
