import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AdaptiveTrainingDefinitionApi } from '@crczp/training-api';
import { TrainingDefinition } from '@crczp/training-model';
import { combineLatest, concat, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { TrainingDefinitionChangeEvent } from '../../../model/events/training-definition-change-event';
import { AdaptiveDefinitionEditService } from './adaptive-definition-edit.service';
import { PhaseEditService } from '../phase/phase-edit.service';
import { ErrorHandlerService, LoadingTracker, NotificationService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Service handling editing of training definition and related operations.
 * Serves as a layer between component and API service
 * Subscribe to trainingDefinition$ to receive latest data updates.
 */
@Injectable()
export class AdaptiveDefinitionEditConcreteService extends AdaptiveDefinitionEditService {
    private router = inject(Router);
    private api = inject(AdaptiveTrainingDefinitionApi);
    private errorHandler = inject(ErrorHandlerService);
    private notificationService = inject(NotificationService);
    private phaseEditService = inject(PhaseEditService);

    private editedSnapshot: TrainingDefinition;
    private loadingTracker: LoadingTracker = new LoadingTracker();
    public hasUnsavedChanges$ = combineLatest([
        this.formValidSubject.asObservable(),
        this.loadingTracker.isLoading$,
    ]).pipe(map(([valid, loading]) => loading || !valid));

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
            // checks if TD was edited if not only phases are updated
            if (this.editedSnapshot) {
                return concat(
                    this.update(),
                    this.phaseEditService.saveUnsavedPhases(),
                );
            } else {
                return concat(
                    this.phaseEditService.saveUnsavedPhases(),
                    this.api
                        .get(
                            this.trainingDefinitionSubject$.getValue().id,
                            true,
                        )
                        .pipe(
                            tap((val) =>
                                this.trainingDefinitionSubject$.next(val),
                            ),
                        ),
                );
            }
        } else {
            return this.create().pipe(
                map((id) =>
                    this.router.navigate([
                        Routing.RouteBuilder.adaptive_definition
                            .definitionId(id)
                            .edit.build(),
                    ]),
                ),
            );
        }
    }

    /**
     * Updated saveDisabled$ and saved snapshot of edited training definition
     * @param changeEvent training definition object and its validity
     */
    change(changeEvent: TrainingDefinitionChangeEvent): void {
        this.formValidSubject.next(changeEvent.isValid);
        this.definitionValidSubject$.next(changeEvent.isValid);
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
                    () => {
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
        this.formValidSubject.next(false);
        this.trainingDefinitionSubject$.next(this.editedSnapshot);
        this.editedSnapshot = null;
    }
}
