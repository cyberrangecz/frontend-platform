import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PoolApi, SandboxDefinitionApi } from '@crczp/sandbox-api';
import { LinearTrainingDefinitionApi, LinearTrainingInstanceApi } from '@crczp/training-api';
import { TrainingDefinitionInfo, TrainingInstance } from '@crczp/training-model';
import { combineLatest, from, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { TrainingInstanceChangeEvent } from '../../../model/events/training-instance-change-event';
import { TrainingInstanceEditService } from './training-instance-edit.service';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { SentinelFilter } from '@sentinel/common/filter';
import { ErrorHandlerService, LoadingTracker, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Basic implementation of layer between component and API service.
 */
@Injectable()
export class TrainingInstanceEditConcreteService extends TrainingInstanceEditService {
    private trainingInstanceApi = inject(LinearTrainingInstanceApi);
    private trainingDefinitionApi = inject(LinearTrainingDefinitionApi);
    private poolApi = inject(PoolApi);
    private sandboxDefinitionApi = inject(SandboxDefinitionApi);
    private router = inject(Router);
    private errorHandler = inject(ErrorHandlerService);
    private notificationService = inject(NotificationService);
    private settings = inject(PortalConfig);

    private editedSnapshot: TrainingInstance;
    private lastPagination: OffsetPaginationEvent;
    private loadingTracker = new LoadingTracker();
    public saveDisabled$ = combineLatest(
        this.loadingTracker.isLoading$,
        this.saveDisabledSubject$.asObservable()
    ).pipe(map(([loading, invalid]) => loading || invalid));

    constructor() {
        super();
    }

    /**
     * Updated saveDisabled$ and saved snapshot of edited training instance
     * @param changeEvent training instance object and its validity
     */
    change(changeEvent: TrainingInstanceChangeEvent): void {
        this.instanceValidSubject$.next(changeEvent.isValid);
        if (changeEvent.trainingInstance.localEnvironment)
            changeEvent.trainingInstance.poolId = null;
        this.editedSnapshot = changeEvent.trainingInstance;
        this.checkInstanceValidity();
    }

    /**
     * Handles change of pool selection
     * @param poolId pool ID of selected pool
     */
    poolSelectionChange(poolId: number): void {
        this.editedSnapshot.poolId = poolId;
        this.editedSnapshot.sandboxDefinitionId = null;
        this.checkInstanceValidity();
    }

    sandboxDefinitionSelectionChange(sandboxDefinitionId: number): void {
        if (!this.editedSnapshot) {
            this.editedSnapshot = this.trainingInstanceSubject$.getValue();
            this.editedSnapshot.accessToken =
                this.editedSnapshot.accessToken.indexOf('-') !== -1
                    ? this.editedSnapshot.accessToken.substring(
                          0,
                          this.editedSnapshot.accessToken.lastIndexOf('-')
                      )
                    : this.editedSnapshot.accessToken;
        }
        this.editedSnapshot.sandboxDefinitionId = sandboxDefinitionId;
        this.editedSnapshot.poolId = null;
        this.checkInstanceValidity();
    }

    /**
     * Saves/creates training instance or handles error.
     */
    save(): Observable<any> {
        if (this.editModeSubject$.getValue()) {
            return this.update();
        } else {
            return this.create().pipe(
                switchMap((id) =>
                    from(
                        this.router.navigate([
                            Routing.RouteBuilder.linear_instance
                                .instanceId(id)
                                .edit.build(),
                        ])
                    )
                )
            );
        }
    }

    /**
     * Sets training instance as currently edited
     * @param trainingInstance to set as currently edited
     */
    set(trainingInstance: TrainingInstance): void {
        let ti = trainingInstance;
        this.setEditMode(trainingInstance);
        if (ti === null) {
            ti = new TrainingInstance();
            ti.showStepperBar = true;
            ti.backwardMode = true;
            this.instanceValidSubject$.next(false);
        }
        this.trainingInstanceSubject$.next(ti);
    }

    getAllTrainingDefinitions(
        offsetPaginationEvent: OffsetPaginationEvent,
        stateFilter: string
    ): Observable<PaginatedResource<TrainingDefinitionInfo>> {
        this.lastPagination = offsetPaginationEvent;
        this.lastPagination.size = Number.MAX_SAFE_INTEGER;
        return this.trainingDefinitionApi
            .getAllForOrganizer(offsetPaginationEvent, [
                new SentinelFilter('state', stateFilter),
            ])
            .pipe(
                tap(
                    (definitions) => {
                        if (stateFilter === 'RELEASED') {
                            this.releasedTrainingDefinitionsSubject.next(
                                definitions
                            );
                        } else {
                            this.unreleasedTrainingDefinitionsSubject.next(
                                definitions
                            );
                        }
                    },
                    (err) =>
                        this.errorHandler.emit(
                            err,
                            'Fetching available training definitions'
                        )
                )
            );
    }

    getAllPools(
        offsetPaginationEvent: OffsetPaginationEvent
    ): Observable<PaginatedResource<Pool>> {
        this.lastPagination = offsetPaginationEvent;
        this.lastPagination.size = Number.MAX_SAFE_INTEGER;
        return this.poolApi.getPools(offsetPaginationEvent).pipe(
            tap(
                (pools) => {
                    this.poolsSubject$.next(pools);
                },
                (err) => this.errorHandler.emit(err, 'Fetching available pools')
            )
        );
    }

    getAllSandboxDefinitions(
        offsetPaginationEvent: OffsetPaginationEvent
    ): Observable<PaginatedResource<SandboxDefinition>> {
        this.lastPagination = offsetPaginationEvent;
        this.lastPagination.size = Number.MAX_SAFE_INTEGER;
        return this.sandboxDefinitionApi.getAll(offsetPaginationEvent).pipe(
            tap(
                (sandboxDefinitions) => {
                    this.sandboxDefinitionsSubject$.next(sandboxDefinitions);
                },
                (err) =>
                    this.errorHandler.emit(
                        err,
                        'Fetching available sandbox definitions'
                    )
            )
        );
    }

    isLocalEnvironmentAllowed(): boolean {
        return !!this.settings.enableLocalMode;
    }

    private checkInstanceValidity(): void {
        this.saveDisabledSubject$.next(
            !this.instanceValidSubject$.value ||
                (!this.editedSnapshot.localEnvironment &&
                    !this.editedSnapshot.poolId)
        );
    }

    private setEditMode(trainingInstance: TrainingInstance) {
        this.editModeSubject$.next(trainingInstance !== null);
    }

    private create(): Observable<number> {
        if (this.editedSnapshot) {
            if (!this.editedSnapshot.startTime)
                this.editedSnapshot.startTime = new Date();
        }
        return this.loadingTracker.trackRequest(() =>
            this.trainingInstanceApi.create(this.editedSnapshot).pipe(
                map((ti) => ti.id),
                tap(
                    () => {
                        this.notificationService.emit(
                            'success',
                            'Training instance was created'
                        );
                        this.onSaved();
                    },
                    (err) =>
                        this.errorHandler.emit(
                            err,
                            'Creating training instance'
                        )
                )
            )
        );
    }

    private update(): Observable<any> {
        if (!this.editedSnapshot) {
            this.editedSnapshot = this.trainingInstanceSubject$.getValue();
        }
        const pagination = new OffsetPaginationEvent(0, 10, '', 'asc');
        this.saveDisabledSubject$.next(true);
        return this.loadingTracker.trackRequest(() =>
            this.trainingInstanceApi.update(this.editedSnapshot).pipe(
                switchMap(() =>
                    this.getAllTrainingDefinitions(pagination, 'RELEASED')
                ),
                switchMap(() =>
                    this.getAllTrainingDefinitions(pagination, 'UNRELEASED')
                ),
                switchMap(() => this.getAllPools(pagination)),
                switchMap(() => this.getAllSandboxDefinitions(pagination)),
                tap(
                    () => {
                        this.notificationService.emit(
                            'success',
                            'Training instance was successfully saved'
                        );
                        this.onSaved();
                    },
                    (err) => {
                        this.saveDisabledSubject$.next(false);
                        this.errorHandler.emit(
                            err,
                            'Editing training instance'
                        );
                    }
                )
            )
        );
    }

    private onSaved() {
        this.editModeSubject$.next(true);
        this.saveDisabledSubject$.next(true);
        this.trainingInstanceSubject$.next(this.editedSnapshot);
        this.editedSnapshot = null;
    }
}
