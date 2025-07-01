/**
 * Service handling editing of training definition's levels and related operations.
 * Serves as a layer between component and API service
 * Subscribe to levels$, activeStep$ and activeLevelCanBeSaved$ to receive latest data updates.
 */
import { AbstractLevelTypeEnum, Level } from '@crczp/training-model';
import { BehaviorSubject, Observable } from 'rxjs';

export abstract class LevelEditService {
    protected trainingDefinitionId: number;

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

    protected levelsSaveDisabledSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if levels are valid and can be saved, false otherwise
     */
    levelsSaveDisabled$: Observable<boolean> = this.levelsSaveDisabledSubject$.asObservable();

    protected levelsValidSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if all levels are valid, false otherwise
     */
    levelsValid$: Observable<boolean> = this.levelsValidSubject$.asObservable();

    protected unsavedLevelsSubject$: BehaviorSubject<Level[]> = new BehaviorSubject([]);

    unsavedLevels$: Observable<Level[]> = this.unsavedLevelsSubject$.asObservable();

    /**
     * Initiates service with levels and related training definition id
     * @param trainingDefinitionId id of training definition
     * @param levels all levels associated with training definition id
     */
    abstract set(trainingDefinitionId: number, levels: Level[]): void;

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
     * Creates new level with default values based on passed level type
     * @param levelType enum of possible level types
     */
    abstract add(levelType: AbstractLevelTypeEnum): Observable<Level>;

    /**
     * Saves changes in edited levels and optionally informs on result of the operation
     */
    abstract saveUnsavedLevels(): Observable<any>;

    /**
     * Displays dialog to delete selected level and displays alert with result of the operation
     */
    abstract deleteSelected(): Observable<Level[]>;

    /**
     * Moves level from index to a new one. Updates optimistically and rollback is performed on error
     * @param fromIndex current index of level
     * @param toIndex new index of level
     */
    abstract move(fromIndex: number, toIndex: number): Observable<any>;
}
