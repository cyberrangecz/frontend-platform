import { inject, Injectable } from '@angular/core';
import { LinearTrainingDefinitionApi } from '@crczp/training-api';
import { TrainingDefinitionWithLevels } from '@crczp/training-model';
import { combineLatest, concat, Observable } from 'rxjs';
import { map, tap, toArray } from 'rxjs/operators';
import { TrainingDefinitionChangeEvent } from '../../../model/events/training-definition-change-event';
import { TrainingDefinitionEditService } from './training-definition-edit.service';
import { LevelEditService } from '../level/level-edit.service';
import { ErrorHandlerService, LoadingTracker, NotificationService } from '@crczp/utils';

/**
 * Service handling editing of training definition and related operations.
 * Serves as a layer between component and API service
 * Subscribe to trainingDefinition$ to receive latest data updates.
 */
@Injectable()
export class TrainingDefinitionEditConcreteService extends TrainingDefinitionEditService {
    private api = inject(LinearTrainingDefinitionApi);
    private errorHandler = inject(ErrorHandlerService);
    private notificationService = inject(NotificationService);
    private levelEditService = inject(LevelEditService);

    private editedSnapshot: TrainingDefinitionWithLevels;
    private loadingTracker = new LoadingTracker();
    public saveDisabled$ = combineLatest(
        this.loadingTracker.isLoading$,
        this.saveDisabledSubject$,
    ).pipe(map(([loading, invalid]) => loading || invalid));

    /**
     * Sets training definition as currently edited
     * @param trainingDefinition to set as currently edited
     */
    set(trainingDefinition: TrainingDefinitionWithLevels): void {
        let td = trainingDefinition;
        this.setEditMode(td);
        if (td === null) {
            td = new TrainingDefinitionWithLevels();
        }
        this.trainingDefinitionSubject$.next(td);
    }

    save(): Observable<number | null> {
        if (this.editModeSubject$.getValue()) {
            // checks if TD was edited if not only levels are updated
            if (this.editedSnapshot) {
                return concat(
                    this.update(),
                    this.levelEditService.saveUnsavedLevels(),
                ).pipe(
                    toArray(),
                    map(() => null),
                );
            } else {
                return this.levelEditService
                    .saveUnsavedLevels()
                    .pipe(map(() => null));
            }
        }
        return this.create();
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

    private setEditMode(trainingDefinition: TrainingDefinitionWithLevels) {
        this.editModeSubject$.next(trainingDefinition !== null);
    }

    private update(): Observable<number> {
        return this.loadingTracker.trackRequest(() =>
            this.api.update(this.editedSnapshot).pipe(
                tap(
                    () => {
                        this.notificationService.emit(
                            'success',
                            'Changes were saved',
                        );
                        this.onSaved();
                    },
                    (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Editing training definition',
                        ),
                ),
            ),
        );
    }

    private create(): Observable<number> {
        return this.loadingTracker.trackRequest(() =>
            this.api.create(this.editedSnapshot).pipe(
                tap(
                    (createdTrainingDefinition) => {
                        this.editedSnapshot.id = createdTrainingDefinition.id;
                        this.notificationService.emit(
                            'success',
                            'Training was created',
                        );
                        this.onSaved();
                    },
                    (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Creating training definition',
                        ),
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
