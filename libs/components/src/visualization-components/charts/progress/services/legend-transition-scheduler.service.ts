import { DestroyRef, Injectable, inject } from '@angular/core';
import { Observable, Subscription, merge, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LAG_STATE_LABELS } from '../config/lag.config';
import { LAG_STATES_FILTERABLE, LagState } from '../types/lag-state.types';
import { LegendItemVm, LegendTransitionEventVm } from '../types/view-model.types';

/**
 * Schedules legend-count recomputations as bars cross lag-state thresholds.
 *
 * Why this exists: the bars series carry a baked-in `keyframeAnimation`
 * that animates `style.fill` at the right instant — the chart's visible
 * color flips on its own. The view-model itself is stable for the binding
 * lifetime (no re-emission on every tick), so the legend chip text never
 * refreshes on its own. This scheduler watches the deterministic future-
 * transition timeline derived from the *pre-filter* classified bar set
 * and emits a fresh `LegendItemVm[]` snapshot at each crossing.
 *
 * Output is an `Observable<readonly LegendItemVm[]>` carrying ONLY the
 * post-crossing updates — the initial legend is already in the
 * view-model's full-dispatch payload, so re-emitting it would be a
 * redundant partial setOption. Scheduling uses an RxJS `timer(delayMs)`
 * per future transition, merged into a single stream. Cleanup hooks the
 * host injector's `DestroyRef`.
 */
@Injectable()
export class LegendTransitionSchedulerService {
    private readonly destroyRef = inject(DestroyRef);
    private subscription: Subscription | null = null;
    /**
     * Reference guard: if `bind()` is called with the same `transitions`
     * array reference that is already subscribed, the call is a no-op.
     * This prevents timer-delay drift caused by `bind()` being invoked on
     * every VM emission — `Date.now()` is called at subscribe time, so
     * re-subscribing would restart delays from the new wall-clock instant
     * rather than from the original `event.atMs` anchor.
     */
    private currentTransitions: readonly LegendTransitionEventVm[] | null = null;

    /**
     * Builds the legend-update stream for one binding.
     *
     * Timer delays are computed as `Math.max(0, event.atMs - Date.now())`
     * at subscribe time. Using `Date.now()` directly (rather than a
     * captured `mountNowMs`) ensures the wall-clock anchor is correct even
     * on legitimate re-binds triggered by a transitions-array change mid-session.
     *
     * @param initialLegend - The legend slice from the bound view-model
     *                        (pre-filter counts at bind time). Used as
     *                        the running tally that each transition mutates.
     * @param transitions   - The pre-computed future-transition schedule
     *                        (`LiveViewModel.legendTransitions`). Already
     *                        derived from pre-filter classified bars.
     * @returns Stream emitting an updated `LegendItemVm[]` per crossing.
     *          Does NOT re-emit the initial legend.
     */
    schedule(
        initialLegend: readonly LegendItemVm[],
        transitions: readonly LegendTransitionEventVm[],
    ): Observable<readonly LegendItemVm[]> {
        const counts = legendToCountMap(initialLegend);

        const updates$ = transitions.map((event) =>
            timer(Math.max(0, event.atMs - Date.now())).pipe(
                map(() => {
                    applyEventToCounts(counts, event);
                    return buildLegendSnapshot(counts);
                }),
            ),
        );

        return merge(...updates$);
    }

    /**
     * Convenience helper that subscribes the scheduler stream to a sink
     * with `DestroyRef` cleanup wired automatically. Cancels any prior
     * subscription so re-arming the scheduler on view-model changes is
     * safe to call repeatedly.
     *
     * Idempotency: if `transitions` is the same reference as the currently
     * active binding, the call is a no-op — timers already in flight are
     * preserved and no delay drift occurs.
     */
    bind(
        initialLegend: readonly LegendItemVm[],
        transitions: readonly LegendTransitionEventVm[],
        sink: (legend: readonly LegendItemVm[]) => void,
    ): void {
        if (transitions === this.currentTransitions) {
            return;
        }
        this.currentTransitions = transitions;
        this.subscription?.unsubscribe();
        this.subscription = this.schedule(initialLegend, transitions)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(sink);
    }

    /** Cancels the active scheduler subscription, if any. */
    cancel(): void {
        this.subscription?.unsubscribe();
        this.subscription = null;
        this.currentTransitions = null;
    }
}

/**
 * Materialises an initial state → count map from the legend slice. The
 * map is then mutated in place as events fire; `buildLegendSnapshot`
 * reads it to produce each emitted view-model slice.
 *
 * Filterable states absent from `initialLegend` are seeded to zero so
 * the snapshot always carries every chip in canonical order.
 */
function legendToCountMap(
    initialLegend: readonly LegendItemVm[],
): Map<LagState, number> {
    const counts = new Map<LagState, number>();
    for (const state of LAG_STATES_FILTERABLE) {
        counts.set(state, 0);
    }
    for (const item of initialLegend) {
        counts.set(item.state, item.count);
    }
    return counts;
}

/**
 * Mutates the running count map for one transition. Non-filterable
 * source or target states (e.g. `INACTIVE`) are silently skipped — the
 * two INACTIVE variants never appear in the legend, so they neither
 * contribute to nor consume chip counts.
 */
function applyEventToCounts(
    counts: Map<LagState, number>,
    event: LegendTransitionEventVm,
): void {
    if (counts.has(event.fromState)) {
        const prev = counts.get(event.fromState) ?? 0;
        counts.set(event.fromState, Math.max(0, prev - 1));
    }
    if (counts.has(event.toState)) {
        const next = counts.get(event.toState) ?? 0;
        counts.set(event.toState, next + 1);
    }
}

/**
 * Projects the running count map into the canonical `LegendItemVm[]`
 * shape that the legend builder consumes. Order is governed by
 * `LAG_STATES_FILTERABLE` so partial dispatches align with the initial
 * series array by id.
 */
function buildLegendSnapshot(
    counts: ReadonlyMap<LagState, number>,
): readonly LegendItemVm[] {
    return LAG_STATES_FILTERABLE.map(
        (state): LegendItemVm => ({
            state,
            label: LAG_STATE_LABELS[state],
            count: counts.get(state) ?? 0,
        }),
    );
}
