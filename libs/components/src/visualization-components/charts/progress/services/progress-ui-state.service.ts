import { Injectable, Signal, signal } from '@angular/core';
import { Utils } from '@crczp/utils';
import { EventKind } from '../types/event.types';
import { TraineeId } from '../types/ids.types';
import { LagState } from '../types/lag-state.types';
import {
    AXIS_MODES,
    AxisMode,
    DEFAULT_AXIS_MODE,
    DEFAULT_SORT_CRITERION,
    SortCriterion,
    SortDirection,
} from '../types/ui-state.types';
import { ProgressUiStateService } from './progress-ui-state.interface.service';

/** localStorage key under which the X-axis scale mode preference persists. */
const AXIS_MODE_STORAGE_KEY = 'crczp.progress.axis-mode';

/**
 * Component-scoped concrete implementation of {@link ProgressUiStateService}.
 *
 * Holds every UI-side reactive value as a plain `signal()` and exposes a
 * read-only view via `asReadonly()`. Toggle mutations route through
 * `Utils.Set` helpers so each emission has a fresh reference.
 */
@Injectable()
export class ProgressUiStateServiceImpl extends ProgressUiStateService {
    private readonly axisModeSignal = signal<AxisMode>(this.readPersistedAxisMode());
    private readonly favoritesSignal = signal<ReadonlySet<TraineeId>>(new Set<TraineeId>());
    private readonly sortCriterionSignal = signal<SortCriterion>(DEFAULT_SORT_CRITERION);
    private readonly sortDirectionSignal = signal<SortDirection>('ASC');
    private readonly selectedLevelOrderSignal = signal<number | null>(null);
    private readonly highlightedLevelOrderSignal = signal<number | null>(null);
    private readonly lagFilterSignal = signal<ReadonlySet<LagState>>(new Set<LagState>());
    private readonly eventTypeFilterSignal = signal<ReadonlySet<EventKind>>(new Set<EventKind>());
    private readonly highlightedTraineeSignal = signal<TraineeId | null>(null);

    readonly axisMode: Signal<AxisMode> = this.axisModeSignal.asReadonly();
    readonly favorites: Signal<ReadonlySet<TraineeId>> = this.favoritesSignal.asReadonly();
    readonly sortCriterion: Signal<SortCriterion> = this.sortCriterionSignal.asReadonly();
    readonly sortDirection: Signal<SortDirection> = this.sortDirectionSignal.asReadonly();
    readonly selectedLevelOrder: Signal<number | null> = this.selectedLevelOrderSignal.asReadonly();
    readonly highlightedLevelOrder: Signal<number | null> = this.highlightedLevelOrderSignal.asReadonly();
    readonly lagFilter: Signal<ReadonlySet<LagState>> = this.lagFilterSignal.asReadonly();
    readonly eventTypeFilter: Signal<ReadonlySet<EventKind>> = this.eventTypeFilterSignal.asReadonly();
    readonly highlightedTrainee: Signal<TraineeId | null> = this.highlightedTraineeSignal.asReadonly();

    /** Sets the X-axis scale mode and persists it for the next reload. */
    override setAxisMode(mode: AxisMode): void {
        this.axisModeSignal.set(mode);
        this.persistAxisMode(mode);
    }

    /**
     * Reads the persisted axis mode, falling back to the default when none is
     * stored, the stored value is unrecognised, or localStorage is unavailable.
     *
     * @returns The axis mode to start from.
     */
    private readPersistedAxisMode(): AxisMode {
        try {
            const stored = localStorage.getItem(AXIS_MODE_STORAGE_KEY);
            return (AXIS_MODES as readonly string[]).includes(stored ?? '')
                ? (stored as AxisMode)
                : DEFAULT_AXIS_MODE;
        } catch {
            return DEFAULT_AXIS_MODE;
        }
    }

    /**
     * Writes the axis mode to localStorage; does nothing when localStorage is
     * unavailable.
     *
     * @param mode - The axis mode to persist.
     */
    private persistAxisMode(mode: AxisMode): void {
        try {
            localStorage.setItem(AXIS_MODE_STORAGE_KEY, mode);
        } catch {
            // localStorage unavailable; the mode is not persisted.
        }
    }

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

    /** Flips `kind` in the event-type filter set. */
    override toggleEventTypeFilter(kind: EventKind): void {
        this.eventTypeFilterSignal.update((current) => Utils.Set.toggle(current, kind));
    }

    /** Replaces the event-type filter set with `kinds`. */
    override setEventTypeFilter(kinds: ReadonlySet<EventKind>): void {
        this.eventTypeFilterSignal.set(kinds);
    }

    /** Sets the hovered trainee, or clears it with `null`. */
    override setHighlightedTrainee(trainee: TraineeId | null): void {
        this.highlightedTraineeSignal.set(trainee);
    }
}
