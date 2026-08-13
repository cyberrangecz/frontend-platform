import {TrainingDefinitionWithLevels} from '@crczp/training-model';
import {BehaviorSubject, Observable} from 'rxjs';
import {filter} from 'rxjs/operators';
import {TrainingDefinitionChangeEvent} from '../../../model/events/training-definition-change-event';

export abstract class TrainingDefinitionEditService {
    protected trainingDefinitionSubject$: BehaviorSubject<TrainingDefinitionWithLevels> = new BehaviorSubject<TrainingDefinitionWithLevels>(
        null,
    );
    /**
     * Currently edited training definition
     */
    trainingDefinition$: Observable<TrainingDefinitionWithLevels> = this.trainingDefinitionSubject$
        .asObservable()
        .pipe(filter((td) => td !== undefined && td !== null));

    protected editModeSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    /**
     * Current mode (edit - true or create - false)
     */
    editMode$ = this.editModeSubject$.asObservable();

    protected saveDisabledSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if it is possible to save edited training definition in its current state, false otherwise
     */
    abstract saveDisabled$: Observable<boolean>;

    protected definitionValidSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if it training definition is in valid state, false otherwise
     */
    definitionValid$ = this.definitionValidSubject$.asObservable();

    /**
     * Sets training definition as currently edited
     * @param trainingDefinition to set as currently edited
     */
    abstract set(trainingDefinition: TrainingDefinitionWithLevels): void;

    /**
     * Persists the edited training definition together with its unsaved levels,
     * creating the definition when none is being edited yet.
     *
     * @returns Identifier of the newly created definition, null when an existing one was updated.
     */
    abstract save(): Observable<number | null>;

    /**
     * Updated saveDisabled$ and saved snapshot of edited training definition
     * @param changeEvent training definition object and its validity
     */
    abstract change(changeEvent: TrainingDefinitionChangeEvent): void;
}
