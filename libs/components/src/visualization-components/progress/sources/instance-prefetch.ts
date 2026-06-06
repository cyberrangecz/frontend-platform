import type { Signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { LinearTrainingDefinitionApi, LinearTrainingInstanceApi } from '@crczp/training-api';
import { TrainingDefinition, TrainingInstance } from '@crczp/training-model';
import {
    catchError,
    EMPTY,
    map,
    merge,
    mergeMap,
    of,
    retry,
    startWith,
    Subject,
    switchMap,
    tap,
    timer,
} from 'rxjs';
import { InstanceId } from '../types/ids.types';

/**
 * Dependencies for the instance prefetch factory.
 *
 *  - `instanceId`: reactive scope. On change the existing prefetch is
 *    discarded and a new fetch is issued.
 *  - `instanceApi`: the existing direct HTTP service. Returns a full
 *    `TrainingInstance` via Cashew-cached call — remounts are free.
 *  - `definitionApi`: used only when the instance response is missing
 *    per-level `estimatedDuration` values. Invisible to consumers.
 */
export interface InstancePrefetchDeps {
    readonly instanceId: Signal<InstanceId>;
    readonly instanceApi: LinearTrainingInstanceApi;
    readonly definitionApi: LinearTrainingDefinitionApi;
}

/**
 * Two-path result from the instance prefetch factory.
 *
 * Both signals start as `null`. After a successful fetch, `instance` becomes
 * non-null and `error` stays null. After exhausting all retries, `error`
 * becomes non-null and `instance` stays null. Calling `retry()` resets both
 * signals and re-triggers the fetch.
 */
export interface InstancePrefetchResult {
    /** Non-null after a successful fetch; null until then and on final failure. */
    readonly instance: Signal<TrainingInstance | null>;
    /** Non-null only after exhausting all retry attempts; null on success. */
    readonly error: Signal<{ message: string } | null>;
    /** Resets both signals and re-triggers the fetch. */
    readonly retry: () => void;
}

/**
 * Returns true when the instance's training definition is missing usable
 * per-level `estimatedDuration` values. Triggers the follow-up definition
 * fetch to enrich the levels array.
 */
function levelsNeedEnrichment(instance: TrainingInstance): boolean {
    const levels = instance.trainingDefinition?.levels;
    if (!levels || levels.length === 0) {
        return true;
    }
    return levels.some((level) => typeof level.estimatedDuration !== 'number');
}

/**
 * Merges enriched levels from a definition fetch into an instance without
 * mutating the Cashew-cached source objects. Produces a new `TrainingInstance`
 * class instance so that prototype methods (`hasStarted`, `isActive`, etc.)
 * remain callable on the emitted value.
 */
function enrichInstanceLevels(
    fetchedInstance: TrainingInstance,
    enrichedDefinition: TrainingDefinition,
): TrainingInstance {
    const enrichedDefinitionCopy = Object.assign(
        new TrainingDefinition(),
        fetchedInstance.trainingDefinition,
        { levels: enrichedDefinition.levels },
    );
    return Object.assign(new TrainingInstance(), fetchedInstance, {
        trainingDefinition: enrichedDefinitionCopy,
    });
}

/**
 * Builds the instance prefetch reactive accessor.
 *
 * Issues `instanceApi.get(id)` once per distinct `instanceId` value. When the
 * instance's training definition does not carry per-level `estimatedDuration`
 * values, issues a follow-up `definitionApi.get(definitionId, true)` and
 * merges the enriched levels before emitting. This detail is invisible to
 * consumers.
 *
 * Retries the full fetch chain (instance + optional definition) up to 3 times
 * with exponential back-off (1 s / 2 s / 4 s). After all retries are
 * exhausted, `error` emits a sentinel `{ message }` and `instance` remains
 * null. On `instanceId` signal change the in-flight request is torn down and
 * both signals reset to null. Calling `retry()` produces the same effect
 * programmatically.
 */
export function createInstancePrefetch(deps: InstancePrefetchDeps): InstancePrefetchResult {
    const { instanceId, instanceApi, definitionApi } = deps;

    const retriggerSubject = new Subject<void>();

    const errorSubject = new Subject<{ message: string } | null>();

    /**
     * Trigger stream: both a new `instanceId` value and a manual retry call
     * enter the same pipeline. On every emission the current in-flight request
     * is cancelled (`switchMap`) and a fresh fetch starts with both signals
     * reset to `null`.
     */
    const trigger$ = merge(
        toObservable(instanceId),
        retriggerSubject.pipe(map(() => instanceId())),
    );

    const instance$ = trigger$.pipe(
        tap(() => errorSubject.next(null)),
        switchMap((currentInstanceId) =>
            instanceApi.get(currentInstanceId).pipe(
                mergeMap((fetchedInstance) => {
                    if (!levelsNeedEnrichment(fetchedInstance)) {
                        return of(fetchedInstance);
                    }
                    return definitionApi
                        .get(fetchedInstance.trainingDefinition.id, true)
                        .pipe(
                            map((enrichedDefinition) =>
                                enrichInstanceLevels(fetchedInstance, enrichedDefinition),
                            ),
                        );
                }),
                retry({
                    count: 3,
                    delay: (_error, backoffAttempt) =>
                        timer(2 ** (backoffAttempt - 1) * 1000),
                }),
                catchError((caughtError: unknown) => {
                    let message: string;
                    if (caughtError instanceof HttpErrorResponse) {
                        message = `HTTP ${caughtError.status}: ${caughtError.statusText}`;
                    } else if (caughtError instanceof Error) {
                        message = caughtError.message;
                    } else {
                        message = 'Failed to load training instance';
                    }
                    errorSubject.next({ message });
                    return EMPTY;
                }),
                startWith(null),
            ),
        ),
    );

    const instanceSignal = toSignal(instance$, { initialValue: null });
    const errorSignal = toSignal(errorSubject.asObservable(), { initialValue: null });

    return {
        instance: instanceSignal,
        error: errorSignal,
        retry: () => retriggerSubject.next(),
    };
}
