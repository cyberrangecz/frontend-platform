import { computed, Injectable, Signal, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EntityResolverService } from '@crczp/event-query-engine';
import { TrainingInstanceBasic } from '@crczp/training-model';
import { catchError, map, of } from 'rxjs';
import {
    ChartSourceStatus,
    LevelBasicView,
    mergeSourceStatuses,
    QuerySource,
    resolveInstanceLevels,
} from '../../shared';
import { buildViewModel } from '../selectors/build-view-model';
import { withLagState } from '../selectors/with-lag-state';
import { createBarsSource } from '../sources/bars-source';
import { createEventsSource } from '../sources/events-source';
import { BarRow, LevelInfo } from '../types/bar.types';
import { EventRow } from '../types/event.types';
import { asLevelId, InstanceId, LevelId } from '../types/ids.types';
import { HighlightVm } from '../types/ui-state.types';
import { ViewModel } from '../types/view-model.types';
import { ProgressFeedService } from './progress-feed.interface.service';
import { ProgressUiStateService } from './progress-ui-state.interface.service';

/**
 * Conversion factor from the `LevelBasicView.estimatedDuration` unit
 * (minutes) to the millisecond-based `LevelInfo.estimatedDurationMs`
 * the visualization consumes downstream.
 */
const MS_PER_MINUTE = 60_000;

/**
 * Outcome of resolving the training instance and its levels through the
 * cached entity resolver: `loading` before the first emission, `error`
 * when the instance cannot be resolved or the fetch fails, and `ready`
 * with the resolved instance and ordered level list otherwise.
 */
type InstanceResolveState =
    | { readonly kind: 'loading' }
    | { readonly kind: 'error' }
    | {
          readonly kind: 'ready';
          readonly instance: TrainingInstanceBasic;
          readonly levels: readonly LevelBasicView[];
      };

/**
 * Component-scoped concrete implementation of {@link ProgressFeedService}.
 *
 * Wires the bars and events query sources plus the cached resolver-backed
 * instance resolution into a single reactive surface and assembles the
 * view-model.
 *
 * Two-stage view-model assembly:
 *   1. Pre-resolution (instance signal is `null`): emits `null` to signal
 *      the chart is not ready; the renderer leaves the chart blank.
 *   2. Post-resolution (instance signal is non-null): emits a
 *      {@link buildViewModel} envelope composed from the source signals,
 *      the resolved level metadata, the mount-time snapshot, and the
 *      {@link ProgressUiStateService} accessors.
 *
 * Each view-model emit samples the current wall-clock as `mountNowMs` to
 * anchor keyframe animations. The renderer drives visual progression
 * between emits via per-frame keyframe interpolation; the view-model
 * itself does not re-emit on every tick.
 *
 * Re-binding is not supported. The sources and the resolver stream bridge
 * their observables to signals via `toSignal`, which ties the bridge to the
 * host component's `DestroyRef`; tearing the bridge down mid-life would
 * require a child injector, which is out of scope here. The host's
 * `instanceId` input is `input.required()`, which yields a stable signal
 * reference for the component's lifetime.
 */
@Injectable()
export class ProgressFeedServiceImpl extends ProgressFeedService {
    private readonly ui = inject(ProgressUiStateService);
    private readonly resolver = inject(EntityResolverService);

    private mountNowMs: number | null = null;

    private readonly axisNowMsSignal = signal<number>(Date.now());

    private readonly barsSignal = signal<readonly BarRow[]>([]);
    private readonly eventsSignal = signal<readonly EventRow[]>([]);

    private readonly barsHolder = signal<QuerySource<readonly BarRow[]> | null>(null);
    private readonly eventsHolder = signal<QuerySource<readonly EventRow[]> | null>(null);
    private readonly resolvedHolder = signal<Signal<InstanceResolveState> | null>(null);

    /**
     * Bridges a query source's `vm` signal into a flat `Signal<T>` with a
     * stable empty fallback. Reading via this indirection lets the view-
     * model `computed()` subscribe before {@link bind} has assigned the
     * underlying sources, and substitutes the empty array while the source
     * has not yet emitted.
     */
    private readonly bars$ = computed<readonly BarRow[]>(() => {
        const source = this.barsHolder();
        return source === null ? this.barsSignal() : (source.vm() ?? this.barsSignal());
    });
    private readonly events$ = computed<readonly EventRow[]>(() => {
        const source = this.eventsHolder();
        return source === null ? this.eventsSignal() : (source.vm() ?? this.eventsSignal());
    });

    /**
     * Instance-resolution state, reading `loading` until {@link bind} has
     * assigned the resolver stream.
     */
    private readonly resolved$ = computed<InstanceResolveState>(() => {
        const holder = this.resolvedHolder();
        return holder === null ? { kind: 'loading' } : holder();
    });

    private readonly instance$ = computed<TrainingInstanceBasic | null>(() => {
        const state = this.resolved$();
        return state.kind === 'ready' ? state.instance : null;
    });

    private readonly resolvedLevels = computed<readonly LevelBasicView[]>(() => {
        const state = this.resolved$();
        return state.kind === 'ready' ? state.levels : [];
    });

    /**
     * Level metadata derived from the resolved training definition.
     * Re-evaluates only when the resolved level list flips identity, not
     * on the live tick.
     */
    private readonly levelsByIdSignal = computed<ReadonlyMap<LevelId, LevelInfo>>(() => {
        const map = new Map<LevelId, LevelInfo>();
        for (const level of this.resolvedLevels()) {
            map.set(asLevelId(level.id), {
                id: level.id,
                order: level.order,
                type: level.type,
                title: level.title,
                estimatedDurationMs: level.estimatedDuration * MS_PER_MINUTE,
            });
        }
        return map;
    });

    private readonly levelOrderSignal = computed<readonly LevelId[]>(() =>
        [...this.resolvedLevels()]
            .sort((a, b) => a.order - b.order)
            .map((level) => asLevelId(level.id)),
    );

    private readonly instanceEndMsSignal = computed<number | null>(() => {
        const instance = this.instance$();
        return instance === null ? null : instance.endTime.getTime();
    });

    readonly bars: Signal<readonly BarRow[]> = this.bars$;
    readonly events: Signal<readonly EventRow[]> = this.events$;
    readonly instance: Signal<TrainingInstanceBasic | null> = this.instance$;
    readonly levelsById: Signal<ReadonlyMap<LevelId, LevelInfo>> = this.levelsByIdSignal;
    readonly levelOrder: Signal<readonly LevelId[]> = this.levelOrderSignal;
    readonly instanceEndMs: Signal<number | null> = this.instanceEndMsSignal;

    /**
     * Worst-case data status across instance resolution and the two query
     * sources, for the panel shell. A failed or not-found instance reads as
     * `error`; an unresolved instance or unbound source reads as `loading`;
     * once both sources settle, `mergeSourceStatuses` combines them, and the
     * `empty`/`ready` outcome is decided by whether any bar rows exist so an
     * empty event overlay never blanks a populated chart.
     */
    readonly status: Signal<ChartSourceStatus> = computed<ChartSourceStatus>(() => {
        const state = this.resolved$();
        if (state.kind === 'error') {
            return 'error';
        }
        if (state.kind === 'loading') {
            return 'loading';
        }
        const bars = this.barsHolder();
        const events = this.eventsHolder();
        if (bars === null || events === null) {
            return 'loading';
        }
        const merged = mergeSourceStatuses(bars.status(), events.status());
        if (merged === 'ready' || merged === 'empty') {
            return this.bars$().length === 0 ? 'empty' : 'ready';
        }
        return merged;
    });

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
     * Captures the mount-time snapshot and wires the bars and events query
     * sources plus the resolver-backed instance resolution. The snapshot
     * anchors engine-driven motion and is read once from the time-
     * interpolation service.
     *
     * Must be called from an Angular injection context (typically the
     * host component's constructor). The sources and the resolver stream
     * bridge observables to signals without an explicit injector, resolving
     * the host's `DestroyRef` from the ambient injection context.
     *
     * Second and subsequent calls are no-ops. Re-binding is not supported
     * because the bridges are tied to the host `DestroyRef` and cannot be
     * torn down mid-life.
     *
     * @param instanceId - Host-provided instance identifier signal.
     */
    override bind(instanceId: Signal<InstanceId>): void {
        if (this.mountNowMs !== null) {
            return; // re-binding not supported; caller is responsible for lifecycle isolation
        }
        this.mountNowMs = Date.now();
        this.axisNowMsSignal.set(this.mountNowMs);

        const resolved$ = resolveInstanceLevels(instanceId, this.resolver).pipe(
            map((resolved): InstanceResolveState =>
                resolved === null
                    ? { kind: 'error' }
                    : { kind: 'ready', instance: resolved.instance, levels: resolved.levels },
            ),
            catchError(() => of<InstanceResolveState>({ kind: 'error' })),
        );

        this.resolvedHolder.set(
            toSignal(resolved$, { initialValue: { kind: 'loading' } as InstanceResolveState }),
        );
        this.barsHolder.set(createBarsSource(instanceId));
        this.eventsHolder.set(createEventsSource(instanceId));
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
}
