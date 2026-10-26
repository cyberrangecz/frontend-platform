import { inject, Injectable } from '@angular/core';
import { LinearTrainingDefinitionApi } from '@crczp/training-api';
import { TrainingDefinitionWithLevels } from '@crczp/training-model';
import { combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TrainingDefinitionChangeEvent } from '../../../model/events/training-definition-change-event';
import { TrainingDefinitionEditService } from './training-definition-edit.service';
import { LevelEditService } from '../level/level-edit.service';
import { createDefaultLevels } from '../level/new-level.factory';
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

    private loadingTracker = new LoadingTracker();
    public saving$ = this.loadingTracker.isLoading$;
    public saveDisabled$ = combineLatest(
        this.saving$,
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
        return this.editModeSubject$.getValue() ? this.update() : this.create();
    }

    /**
     * Updates the validity state of the edited training definition
     * @param changeEvent training definition object and its validity
     */
    change(changeEvent: TrainingDefinitionChangeEvent): void {
        this.definitionValidSubject$.next(changeEvent.isValid);
        this.saveDisabledSubject$.next(!changeEvent.isValid);
    }

    private setEditMode(trainingDefinition: TrainingDefinitionWithLevels) {
        this.editModeSubject$.next(trainingDefinition !== null);
    }

    private update(): Observable<null> {
        const definition = this.trainingDefinitionSubject$.getValue();
        definition.levels = this.levelEditService.getLevels();
        return this.loadingTracker.trackRequest(() =>
            this.api.update(definition).pipe(
                tap({
                    next: (saved) => {
                        this.notificationService.emit(
                            'success',
                            'Changes were saved',
                        );
                        this.onSaved(saved);
                    },
                    error: (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Saving training definition',
                        ),
                }),
                map(() => null),
            ),
        );
    }

    private create(): Observable<number> {
        const definition = this.trainingDefinitionSubject$.getValue();
        definition.levels = definition.defaultContent
            ? createDefaultLevels()
            : [];
        return this.loadingTracker.trackRequest(() =>
            this.api.create(definition).pipe(
                tap({
                    next: (created) => {
                        this.notificationService.emit(
                            'success',
                            'Training was created',
                        );
                        this.onSaved(created);
                    },
                    error: (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Creating training definition',
                        ),
                }),
                map((created) => created.id),
            ),
        );
    }

    /**
     * Replaces the edited definition with the stored one, so ids of levels and their nested items and the
     * version come from the server.
     */
    private onSaved(saved: TrainingDefinitionWithLevels) {
        this.trainingDefinitionSubject$.next(saved);
        this.editModeSubject$.next(true);
        this.saveDisabledSubject$.next(true);
    }
}
