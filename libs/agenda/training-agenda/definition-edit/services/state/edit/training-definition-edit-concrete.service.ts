import { Injectable, inject } from '@angular/core';
import {Router} from '@angular/router';
import {TrainingDefinitionApi} from '@crczp/training-api';
import {TrainingDefinition} from '@crczp/training-model';
import {combineLatest, concat, Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {TrainingDefinitionChangeEvent} from '../../../model/events/training-definition-change-event';
import {TrainingErrorHandler, TrainingNavigator, TrainingNotificationService} from '@crczp/training-agenda';
import {TrainingDefinitionEditService} from './training-definition-edit.service';
import {LevelEditService} from '../level/level-edit.service';
import {LoadingTracker} from "@crczp/common";

/**
 * Service handling editing of training definition and related operations.
 * Serves as a layer between component and API service
 * Subscribe to trainingDefinition$ to receive latest data updates.
 */
@Injectable()
export class TrainingDefinitionEditConcreteService extends TrainingDefinitionEditService {
    private router = inject(Router);
    private api = inject(TrainingDefinitionApi);
    private errorHandler = inject(TrainingErrorHandler);
    private navigator = inject(TrainingNavigator);
    private notificationService = inject(TrainingNotificationService);
    private levelEditService = inject(LevelEditService);

    private editedSnapshot: TrainingDefinition;
    private loadingTracker = new LoadingTracker();
    public saveDisabled$ = combineLatest(this.loadingTracker.isLoading$, this.saveDisabledSubject$).pipe(
        map(([loading, invalid]) => loading || invalid),
    );

    /**
     * Sets training definition as currently edited
     * @param trainingDefinition to set as currently edited
     */
    set(trainingDefinition: TrainingDefinition): void {
        let td = trainingDefinition;
        this.setEditMode(td);
        if (td === null) {
            td = new TrainingDefinition();
        }
        this.trainingDefinitionSubject$.next(td);
    }

    /**
     * Saves/creates training definition based on edit mode or handles error.
     */
    save(): Observable<any> {
        if (this.editModeSubject$.getValue()) {
            // checks if TD was edited if not only levels are updated
            if (this.editedSnapshot) {
                return concat(this.update(), this.levelEditService.saveUnsavedLevels());
            } else {
                return this.levelEditService.saveUnsavedLevels();
            }
        } else {
            return this.create().pipe(map((id) => this.router.navigate([this.navigator.toTrainingDefinitionEdit(id)])));
        }
    }

    /**
     * Updated saveDisabled$ and saved snapshot of edited training definition
     * @param changeEvent training definition object and its validity
     */
    change(changeEvent: TrainingDefinitionChangeEvent): void {
        this.definitionValidSubject$.next(changeEvent.isValid);
        this.saveDisabledSubject$.next(!changeEvent.isValid);
        this.editedSnapshot = changeEvent.trainingDefinition;
    }

    private setEditMode(trainingDefinition: TrainingDefinition) {
        this.editModeSubject$.next(trainingDefinition !== null);
    }

    private update(): Observable<number> {
        return this.loadingTracker.trackRequest(() =>
            this.api.update(this.editedSnapshot).pipe(
                tap(
                    () => {
                        this.notificationService.emit('success', 'Changes were saved');
                        this.onSaved();
                    },
                    (err) => this.errorHandler.emit(err, 'Editing training definition'),
                ),
            ),
        );
    }

    private create(): Observable<number> {
        return this.loadingTracker.trackRequest(() =>
            this.api.create(this.editedSnapshot).pipe(
                tap(
                    () => {
                        this.notificationService.emit('success', 'Training was created');
                        this.onSaved();
                    },
                    (err) => this.errorHandler.emit(err, 'Creating training definition'),
                ),
                map((td) => td.id),
            ),
        );
    }

    private onSaved() {
        this.editModeSubject$.next(true);
        this.saveDisabledSubject$.next(true);
        this.trainingDefinitionSubject$.next(this.editedSnapshot);
        this.editedSnapshot = null;
    }
}
