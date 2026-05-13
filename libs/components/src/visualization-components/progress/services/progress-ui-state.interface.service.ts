import { Signal } from '@angular/core';
import { TraineeId } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import { SortCriterion, SortDirection } from '../types/sort.types';

/**
 * Owns all UI-side reactive state for the visualization — the values
 * the user manipulates that affect what is shown but are not part of
 * the data.
 *
 * Exposes a reactive accessor and one or more setters per concept.
 * Convenience toggles (favourite, sort direction, lag-state filter)
 * are first-class to avoid duplicating read-modify-write at every
 * consumer.
 *
 * Boundaries:
 *  - no data dependencies; knows nothing about bars, events, instance
 *  - no persistence today; future hooks (localStorage favourites)
 *    attach here, not at consumers
 *  - no coupling to the renderer
 *  - sensible defaults at construction (empty favourites, default sort,
 *    empty filter, null highlights, no selected level)
 *
 * Provided at `<crczp-progress-visualization>` scope so two instances
 * of the chart on the same page have independent UI state.
 */
export abstract class ProgressUiStateService {
    /** Favourited trainees. */
    abstract readonly favorites: Signal<ReadonlySet<TraineeId>>;
    abstract toggleFavorite(trainee: TraineeId): void;
    abstract clearFavorites(): void;

    /** Sort criterion + direction for the trainee ordering. */
    abstract readonly sortCriterion: Signal<SortCriterion>;
    abstract readonly sortDirection: Signal<SortDirection>;
    abstract setSort(criterion: SortCriterion, direction: SortDirection): void;
    abstract toggleSortDirection(): void;

    /** Selected level filter from the stepper. `null` when no level selected. */
    abstract readonly selectedLevelOrder: Signal<number | null>;
    abstract setSelectedLevel(order: number | null): void;

    /** Hover-dim level from the stepper. `null` when nothing hovered. */
    abstract readonly highlightedLevelOrder: Signal<number | null>;
    abstract setHighlightedLevel(order: number | null): void;

    /** Active lag-state filter set. Empty means all states pass through. */
    abstract readonly lagFilter: Signal<ReadonlySet<LagState>>;
    abstract toggleLagFilter(state: LagState): void;
    abstract setLagFilter(states: ReadonlySet<LagState>): void;

    /** Highlighted trainee from bar/row hover. `null` when nothing hovered. */
    abstract readonly highlightedTrainee: Signal<TraineeId | null>;
    abstract setHighlightedTrainee(trainee: TraineeId | null): void;
}
