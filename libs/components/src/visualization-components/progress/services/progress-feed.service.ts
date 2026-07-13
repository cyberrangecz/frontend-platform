import { computed, Injectable, Signal, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataBrokerService, EntityResolverService } from '@crczp/event-query-engine';
import { LinearTrainingDefinitionApi, LinearTrainingInstanceApi } from '@crczp/training-api';
import { TrainingInstance } from '@crczp/training-model';
import {
    combineLatest,
    distinctUntilChanged,
    map,
    Observable,
    shareReplay,
    startWith,
    timer,
} from 'rxjs';
import { buildViewModel } from '../selectors/build-view-model';
import { withLagState } from '../selectors/with-lag-state';
import { createBarsSource } from '../sources/bars-source';
import { createEventsSource } from '../sources/events-source';
import { createInstancePrefetch, InstancePrefetchResult } from '../sources/instance-prefetch';
import { BarRow, LevelInfo } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { asLevelId, InstanceId, LevelId } from '../types/ids.types';
import { HighlightVm } from '../types/ui-state.types';
import { ViewModel } from '../types/view-model.types';
import { ProgressFeedService } from './progress-feed.interface.service';
import { ProgressUiStateService } from './progress-ui-state.interface.service';

/**
 * Tick cadence (ms) for the liveness gate. The gate fires only fast
 * enough to detect the wall-clock crossing the instance end time;
 * inner source streams have their own polling cadence and do not
 * piggyback on this tick.
 */
const LIVENESS_TICK_INTERVAL_MS = 1000;

/**
 * Conversion factor from the training-model `estimatedDuration` unit
 * (minutes) to the millisecond-based `LevelInfo.estimatedDurationMs`
 * the visualization consumes downstream.
 */
const MS_PER_MINUTE = 60_000;

/**
 * Component-scoped concrete implementation of {@link ProgressFeedService}.
 *
 * Wires three data sources — bars-source, events-source, and
 * instance-prefetch — into a single reactive surface and assembles the
 * view-model.
 *
 * Two-stage view-model assembly:
 *   1. Pre-resolution (instance signal is `null`): emits `null` to signal
 *      the chart is not ready; the renderer leaves the chart blank.
 *   2. Post-resolution (instance signal is non-null): emits a
 *      {@link buildViewModel} envelope composed from the three source
 *      signals, the derived level metadata, the mount-time snapshot,
 *      and the {@link ProgressUiStateService} accessors.
 *
 * Each view-model emit samples the current wall-clock as `mountNowMs` to
 * anchor keyframe animations. The renderer drives visual progression
 * between emits via per-frame keyframe interpolation; the view-model
 * itself does not re-emit on every tick.
 *
 * Re-binding is not supported. The source factories bridge their
 * observables to signals via `toSignal`, which ties the bridge to the
 * host component's `DestroyRef`; tearing the bridge down mid-life
 * would require a child injector, which is out of scope here. The
 * host's `instanceId` input is `input.required()`, which yields a
 * stable signal reference for the component's lifetime.
 */
@Injectable()
export class ProgressFeedServiceImpl extends ProgressFeedService {
    private readonly ui = inject(ProgressUiStateService);
    private readonly broker = inject(DataBrokerService);
    private readonly resolver = inject(EntityResolverService);
    private readonly instanceApi = inject(LinearTrainingInstanceApi);
    private readonly definitionApi = inject(LinearTrainingDefinitionApi);

    private mountNowMs: number | null = null;
    private instancePrefetchResult: InstancePrefetchResult | null = null;

    private readonly axisNowMsSignal = signal<number>(Date.now());

    private readonly barsSignal = signal<readonly BarRow[]>([]);
    private readonly eventsSignal = signal<readonly EventRow[]>([]);
    private readonly instanceSignal = signal<TrainingInstance | null>(null);
    private readonly errorSignal = signal<{ message: string } | null>(null);

    private readonly barsHolder = signal<Signal<readonly BarRow[]> | null>(null);
    private readonly eventsHolder = signal<Signal<readonly EventRow[]> | null>(null);
    private readonly instanceHolder = signal<Signal<TrainingInstance | null> | null>(null);
    private readonly errorHolder = signal<Signal<{ message: string } | null> | null>(null);

    /**
     * Bridges a holder of `Signal<T>` into a flat `Signal<T>` with a
     * stable fallback. Reading via this indirection lets the view-
     * model `computed()` subscribe before {@link bind} has assigned
     * the underlying source signals.
     */
    private readonly bars$ = computed<readonly BarRow[]>(() => {
        const holder = this.barsHolder();
        return holder === null ? this.barsSignal() : holder();
    });
    private readonly events$ = computed<readonly EventRow[]>(() => {
        const holder = this.eventsHolder();
        return holder === null ? this.eventsSignal() : holder();
    });
    private readonly instance$ = computed<TrainingInstance | null>(() => {
        const holder = this.instanceHolder();
        return holder === null ? this.instanceSignal() : holder();
    });
    private readonly errorComputed = computed<{ message: string } | null>(() => {
        const holder = this.errorHolder();
        return holder === null ? this.errorSignal() : holder();
    });

    /**
     * Level metadata derived from the instance's training definition.
     * Re-evaluates only when the instance signal flips identity, not
     * on the live tick.
     */
    private readonly levelsByIdSignal = computed<ReadonlyMap<LevelId, LevelInfo>>(() => {
        const instance = this.instance$();
        if (instance === null) {
            return new Map<LevelId, LevelInfo>();
        }
        const levels = instance.trainingDefinition?.levels ?? [];
        const map = new Map<LevelId, LevelInfo>();
        for (const level of levels) {
            const levelId = asLevelId(level.id);
            const estimatedDurationMinutes =
                typeof level.estimatedDuration === 'number' ? level.estimatedDuration : 0;
            map.set(levelId, {
                id: level.id,
                order: level.order,
                type: level.type,
                title: level.title,
                estimatedDurationMs: estimatedDurationMinutes * MS_PER_MINUTE,
            });
        }
        return map;
    });

    private readonly levelOrderSignal = computed<readonly LevelId[]>(() => {
        const instance = this.instance$();
        if (instance === null) {
            return [];
        }
        const levels = instance.trainingDefinition?.levels ?? [];
        return [...levels]
            .sort((a, b) => a.order - b.order)
            .map((level) => asLevelId(level.id));
    });

    private readonly instanceEndMsSignal = computed<number | null>(() => {
        const instance = this.instance$();
        return instance === null ? null : instance.endTime.getTime();
    });

    readonly bars: Signal<readonly BarRow[]> = this.bars$;
    readonly events: Signal<readonly EventRow[]> = this.events$;
    readonly instance: Signal<TrainingInstance | null> = this.instance$;
    readonly levelsById: Signal<ReadonlyMap<LevelId, LevelInfo>> = this.levelsByIdSignal;
    readonly levelOrder: Signal<readonly LevelId[]> = this.levelOrderSignal;
    readonly instanceEndMs: Signal<number | null> = this.instanceEndMsSignal;
    readonly error: Signal<{ message: string } | null> = this.errorComputed;

    /**
     * `true` while the chart should keep working. Flips to `false`
     * once the instance has resolved AND the interpolated wall-clock
     * has crossed `endTime`.
     */
    readonly isLive: Signal<boolean> = computed(() => {
        const endMs = this.instanceEndMsSignal();
        if (endMs === null) {
            return true;
        }
        return Date.now() < endMs;
    });

    /**
     * Highlight slice derived from the three discrete UI-state signals
     * the {@link ProgressUiStateService} exposes. Composed locally so
     * the UI-state surface stays orthogonal — no aggregated `highlight`
     * accessor lives on that service.
     */
    private readonly highlight: Signal<HighlightVm> = computed<HighlightVm>(() => ({
        highlightedTrainee: this.ui.highlightedTrainee(),
        selectedLevelOrder: this.ui.selectedLevelOrder(),
        highlightedLevelOrder: this.ui.highlightedLevelOrder(),
    }));

    readonly viewModel: Signal<ViewModel | null> = computed<ViewModel | null>(() => {
        const mountNowMs = Date.now();
        const nowMs = this.axisNowMsSignal();
        const instance = this.instance$();

        if (instance === null) {
            return null;
        }

        const bars = this.bars$();
        const events = this.events$();
        const levelsById = this.levelsByIdSignal();
        const classified = withLagState(
            bars,
            levelsById,
            mountNowMs,
            instance.endTime.getTime(),
        );

        return buildViewModel({
            bars,
            classified,
            events,
            instance,
            levelsById,
            levelOrder: this.levelOrderSignal(),
            mountNowMs,
            nowMs,
            criterion: this.ui.sortCriterion(),
            direction: this.ui.sortDirection(),
            favorites: this.ui.favorites(),
            selectedLevelOrder: this.ui.selectedLevelOrder(),
            lagFilter: this.ui.lagFilter(),
            highlight: this.highlight(),
        });
    });

    /**
     * Captures the mount-time snapshot and wires the three source
     * factories. The snapshot anchors engine-driven motion and is read
     * once from the time-interpolation service.
     *
     * Must be called from an Angular injection context (typically the
     * host component's constructor). Internally calls `toObservable` on
     * a signal without an explicit injector, which resolves the host's
     * `DestroyRef` from the ambient injection context.
     *
     * Second and subsequent calls are no-ops. Re-binding is not supported
     * because source signals are bridged via `toSignal` against the host
     * `DestroyRef` and cannot be torn down mid-life.
     *
     * @param instanceId - Host-provided instance identifier signal.
     */
    override bind(instanceId: Signal<InstanceId>): void {
        if (this.mountNowMs !== null) {
            return; // re-binding not supported; caller is responsible for lifecycle isolation
        }
        this.mountNowMs = Date.now();
        this.axisNowMsSignal.set(this.mountNowMs);

        const liveness$ = this.buildLivenessGate();

        const instancePrefetch = createInstancePrefetch({
            instanceId,
            instanceApi: this.instanceApi,
            definitionApi: this.definitionApi,
        });
        this.instancePrefetchResult = instancePrefetch;

        const barsSource = createBarsSource({
            instanceId,
            broker: this.broker,
            resolver: this.resolver,
            liveness$,
        });
        const eventsSource = createEventsSource({
            instanceId,
            broker: this.broker,
            resolver: this.resolver,
            liveness$,
        });

        this.barsHolder.set(barsSource);
        this.eventsHolder.set(eventsSource);
        this.instanceHolder.set(instancePrefetch.instance);
        this.errorHolder.set(instancePrefetch.error);
    }

    /**
     * Re-triggers the instance prefetch fetch chain. The prefetch's
     * trigger subject re-fans through the same pipeline that the
     * `instanceId` change drives, so a single call resets both the
     * `instance` and `error` signals and re-issues the HTTP request.
     */
    override retry(): void {
        this.instancePrefetchResult?.retry();
    }

    /**
     * Advances the axis now-anchor to the current interpolated time.
     * Writing the signal invalidates the view-model computed, which
     * re-runs `computeAxisWindow` with a fresh `nowMs` and emits a
     * new `axis.endMs` on the next render cycle.
     */
    override refreshAxisNow(): void {
        this.axisNowMsSignal.set(Date.now());
    }

    /**
     * Builds the liveness gate consumed by bars-source and events-
     * source. Emits `true` while the instance is unresolved or while
     * the interpolated wall-clock is before the instance's end time;
     * emits `false` once the wall-clock crosses the end time. Both
     * source consumers share a single subscription via `shareReplay`.
     *
     * `timer(0, interval)` is used in preference to `interval(ms)` so
     * the first value is delivered synchronously on subscribe — the
     * gate starts in the correct state without a one-second delay.
     */
    private buildLivenessGate(): Observable<boolean> {
        return combineLatest([
            toObservable(this.instance$),
            timer(0, LIVENESS_TICK_INTERVAL_MS),
        ]).pipe(
            map(([instance]) => {
                if (instance === null) {
                    return true;
                }
                return Date.now() < instance.endTime.getTime();
            }),
            startWith(true),
            distinctUntilChanged(),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
    }
}
