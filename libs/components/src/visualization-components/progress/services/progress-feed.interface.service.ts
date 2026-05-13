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
 * Exposes the assembled view-model signal — already the right mode
 * (live when bars are present, skeleton otherwise) — so the renderer
 * has a single reactive input to consume.
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
     * supported; supplying a different `Signal` reference replaces the
     * scope and tears down the existing subscriptions.
     */
    abstract bind(instanceId: Signal<InstanceId>): void;

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
     * Assembled view-model. Carries the `mode` tag — `live` once bars
     * have arrived, `skeleton` while the bars source is empty.
     */
    abstract readonly viewModel: Signal<ViewModel>;
}
