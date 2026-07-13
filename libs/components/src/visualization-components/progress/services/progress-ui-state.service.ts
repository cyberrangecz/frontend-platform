import { Injectable, Signal, signal } from '@angular/core';
import { Utils } from '@crczp/utils';
import { TraineeId } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import { DEFAULT_SORT_CRITERION, SortCriterion, SortDirection } from '../types/ui-state.types';
import { ProgressUiStateService } from './progress-ui-state.interface.service';

/**
 * Component-scoped concrete implementation of {@link ProgressUiStateService}.
 *
 * Holds every UI-side reactive value as a plain `signal()` and exposes a
 * read-only view via `asReadonly()`. All set-typed mutations route through
 * `Utils.Set` helpers so each emission has a fresh reference.
 */
@Injectable()
export class ProgressUiStateServiceImpl extends ProgressUiStateService {
    private readonly favoritesSignal = signal<ReadonlySet<TraineeId>>(new Set<TraineeId>());
    private readonly sortCriterionSignal = signal<SortCriterion>(DEFAULT_SORT_CRITERION);
    private readonly sortDirectionSignal = signal<SortDirection>('ASC');
    private readonly selectedLevelOrderSignal = signal<number | null>(null);
    private readonly highlightedLevelOrderSignal = signal<number | null>(null);
    private readonly lagFilterSignal = signal<ReadonlySet<LagState>>(new Set<LagState>());
    private readonly highlightedTraineeSignal = signal<TraineeId | null>(null);

    readonly favorites: Signal<ReadonlySet<TraineeId>> = this.favoritesSignal.asReadonly();
    readonly sortCriterion: Signal<SortCriterion> = this.sortCriterionSignal.asReadonly();
    readonly sortDirection: Signal<SortDirection> = this.sortDirectionSignal.asReadonly();
    readonly selectedLevelOrder: Signal<number | null> = this.selectedLevelOrderSignal.asReadonly();
    readonly highlightedLevelOrder: Signal<number | null> = this.highlightedLevelOrderSignal.asReadonly();
    readonly lagFilter: Signal<ReadonlySet<LagState>> = this.lagFilterSignal.asReadonly();
    readonly highlightedTrainee: Signal<TraineeId | null> = this.highlightedTraineeSignal.asReadonly();

    /** Flips `trainee` in the favourites set. */
    override toggleFavorite(trainee: TraineeId): void {
        this.favoritesSignal.update((current) => Utils.Set.toggle(current, trainee));
    }

    /** Empties the favourites set; no-op when already empty. */
    override clearFavorites(): void {
        if (this.favoritesSignal().size > 0) {
            this.favoritesSignal.set(new Set<TraineeId>());
        }
    }

    /** Assigns sort `criterion` and `direction` in a single emission pair. */
    override setSort(criterion: SortCriterion, direction: SortDirection): void {
        this.sortCriterionSignal.set(criterion);
        this.sortDirectionSignal.set(direction);
    }

    /** Flips the current sort direction between `'ASC'` and `'DESC'`. */
    override toggleSortDirection(): void {
        this.sortDirectionSignal.update((current) => (current === 'ASC' ? 'DESC' : 'ASC'));
    }

    /** Sets the stepper-driven level filter, or clears it with `null`. */
    override setSelectedLevel(order: number | null): void {
        this.selectedLevelOrderSignal.set(order);
    }

    /** Sets the stepper-driven hover-dim level, or clears it with `null`. */
    override setHighlightedLevel(order: number | null): void {
        this.highlightedLevelOrderSignal.set(order);
    }

    /** Flips `state` in the lag-state filter set. */
    override toggleLagFilter(state: LagState): void {
        this.lagFilterSignal.update((current) => Utils.Set.toggle(current, state));
    }

    /** Replaces the lag-state filter set with `states`. */
    override setLagFilter(states: ReadonlySet<LagState>): void {
        this.lagFilterSignal.set(states);
    }

    /** Sets the hovered trainee, or clears it with `null`. */
    override setHighlightedTrainee(trainee: TraineeId | null): void {
        this.highlightedTraineeSignal.set(trainee);
    }
}
