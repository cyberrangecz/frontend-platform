import {AbstractLevelTypeEnum, Level} from '@crczp/training-model';
import {BehaviorSubject, Observable} from 'rxjs';

/**
 * Holds the levels of the edited training definition and applies add, delete, move and edit locally.
 * The levels reach the backend only through the save of the whole definition.
 */
export abstract class LevelEditService {
    protected levelsSubject$: BehaviorSubject<Level[]> = new BehaviorSubject([]);
    /**
     * All currently edited levels of training definition
     */
    levels$ = this.levelsSubject$.asObservable();

    protected activeStepSubject$: BehaviorSubject<number> = new BehaviorSubject(0);

    /**
     * Index of selected level
     */
    activeStep$ = this.activeStepSubject$.asObservable();

    protected levelsValidSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if all levels are valid, false otherwise
     */
    levelsValid$: Observable<boolean> = this.levelsValidSubject$.asObservable();

    protected hasUnsavedChangesSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    /**
     * True while the levels differ from the last saved state, false otherwise
     */
    hasUnsavedChanges$: Observable<boolean> = this.hasUnsavedChangesSubject$.asObservable();

    /**
     * Initiates service with the saved levels and discards unsaved changes
     * @param levels all levels of the training definition as last saved
     */
    abstract set(levels: Level[]): void;

    /**
     * Levels in their current order, unsaved changes included
     */
    abstract getLevels(): Level[];

    abstract getLevelsCount(): number;

    abstract setActiveLevel(levelIndex: number): void;

    /**
     * Performs necessary actions to initiate and update values related to active level change
     * @param level new active level
     */
    abstract onActiveLevelChanged(level: Level): void;

    abstract getSelected(): Level;

    abstract navigateToLastLevel(): void;

    abstract navigateToPreviousLevel(): void;

    /**
     * Appends a new level with placeholder values based on passed level type and selects it
     * @param levelType enum of possible level types
     */
    abstract add(levelType: AbstractLevelTypeEnum): Observable<Level>;

    /**
     * Displays dialog to delete selected level and removes the level once confirmed
     */
    abstract deleteSelected(): Observable<Level[]>;

    /**
     * Moves level from index to a new one
     * @param fromIndex current index of level
     * @param toIndex new index of level
     */
    abstract move(fromIndex: number, toIndex: number): void;

    /**
     * Makes add, delete and move leave the levels untouched while editing is blocked
     * @param blocked true when the definition cannot be edited
     */
    abstract setEditingBlocked(blocked: boolean): void;
}
