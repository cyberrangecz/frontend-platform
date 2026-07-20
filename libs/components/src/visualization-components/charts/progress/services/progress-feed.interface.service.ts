import { Signal } from '@angular/core';
import { TrainingInstance } from '@crczp/training-model';
import { BarRow } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { InstanceId, LevelId } from '../types/ids.types';
import { LevelInfo } from '../types/bar.types';
import { ViewModel } from '../types/view-model.types';

/**
 * Single entry point for accessing source data inside the progress
 * visualization.
 *
 * Owns the wiring between the three acquisition sources (bars, events,
 * instance prefetch) and the rest of the visualization. Converts each
 * source observable into a reactive signal scoped to the host
 * component's destruction lifecycle.
 *
 * Exposes the assembled view-model signal — the live view-model once the
 * instance prefetch resolves, `null` until then — so the renderer has a
 * single reactive input to consume.
 *
 * Boundaries:
 *  - no mutation surface; consumers cannot push data in
 *  - no business logic; classification/ordering/filtering live in selectors
 *  - no knowledge of the chart, renderer, or option layer
 *  - no interaction with the UI state service (read it externally)
 *  - liveness gating lives here: when the instance is past-ended, source
 *    subscriptions complete and no further data flows
 *
 * Provided at `<crczp-progress-visualization>` scope so two instances
 * of the chart on the same page have independent feeds.
 */
export abstract class ProgressFeedService {
    /**
     * Binds the feed to the visualization's instance-id input. Called
     * once by the host component on construction. Re-binding is not
     * supported; the underlying source observables are bridged to
     * signals against the host's `DestroyRef` and cannot be torn down
     * mid-life from inside this service.
     */
    abstract bind(instanceId: Signal<InstanceId>): void;

    /**
     * Re-triggers the instance prefetch fetch chain after a terminal
     * error. Delegated to the instance-prefetch result's retry handle;
     * a no-op before {@link bind}.
     */
    abstract retry(): void;

    /** Raw bar rows, after entity resolution. Empty array until first cycle. */
    abstract readonly bars: Signal<readonly BarRow[]>;

    /** Raw event rows, after entity resolution. Empty array until first cycle. */
    abstract readonly events: Signal<readonly EventRow[]>;

    /** Full training instance from the direct HTTP prefetch. `null` until resolved. */
    abstract readonly instance: Signal<TrainingInstance | null>;

    /** Per-level metadata derived from the instance's training definition. */
    abstract readonly levelsById: Signal<ReadonlyMap<LevelId, LevelInfo>>;

    /** Ordered list of `LevelId`s for stepper iteration. */
    abstract readonly levelOrder: Signal<readonly LevelId[]>;

    /** Instance end time in ms. `null` until the prefetch resolves. */
    abstract readonly instanceEndMs: Signal<number | null>;

    /**
     * `true` while the chart should keep working (polling, ticking).
     * `false` once the instance is past-ended. Derived from
     * `instanceEndMs` and the time tick.
     */
    abstract readonly isLive: Signal<boolean>;

    /**
     * Terminal prefetch error sentinel, surfaced from the instance
     * prefetch source. `null` while loading, while a fetch is in
     * flight, and on success. Non-null after the prefetch exhausts
     * its retries; the host component renders an error UI when this
     * is non-null.
     */
    abstract readonly error: Signal<{ message: string } | null>;

    /**
     * Assembled view-model. The live view-model once the instance
     * prefetch has resolved, `null` while it has not.
     */
    abstract readonly viewModel: Signal<ViewModel | null>;

    /**
     * Refreshes the axis now-anchor to the current wall-clock time so
     * that the next view-model emission carries a fresh `axis.endMs`.
     * Called by the chart renderer's watchdog when the remaining right-
     * padding (axisEnd − now) drops below the refresh threshold.
     */
    abstract refreshAxisNow(): void;
}
