import { TrainingDefinition } from '@crczp/training-model';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TrainingDefinitionChangeEvent } from '../../../model/events/training-definition-change-event';

export abstract class AdaptiveDefinitionEditService {
    protected trainingDefinitionSubject$: BehaviorSubject<TrainingDefinition> = new BehaviorSubject(null);
    /**
     * Currently edited training definition
     */
    trainingDefinition$: Observable<TrainingDefinition> = this.trainingDefinitionSubject$
        .asObservable()
        .pipe(filter((td) => td !== undefined && td !== null));

    protected editModeSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    /**
     * Current mode (edit - true or create - false)
     */
    editMode$ = this.editModeSubject$.asObservable();

    protected formValidSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
    /**
     * True if it is possible to save edited training definition in its current state, false otherwise
     */
    abstract saveDisabled$: Observable<boolean>;

    protected definitionValidSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if training definition is in valid state, false otherwise
     */
    definitionValid$ = this.definitionValidSubject$.asObservable();

    /**
     * Sets training definition as currently edited
     * @param trainingDefinition to set as currently edited
     */
    abstract set(trainingDefinition: TrainingDefinition): void;

    /**
     * Saves/creates training definition based on edit mode or handles error.
     */
    abstract save(): Observable<any>;

    /**
     * Updated saveDisabled$ and saved snapshot of edited training definition
     * @param changeEvent training definition object and its validity
     */
    abstract change(changeEvent: TrainingDefinitionChangeEvent): void;
}
