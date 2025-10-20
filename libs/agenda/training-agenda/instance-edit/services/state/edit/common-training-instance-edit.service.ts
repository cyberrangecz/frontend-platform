import { Router } from '@angular/router';
import { PoolApi, PoolSort, SandboxDefinitionApi, SandboxDefinitionSort } from '@crczp/sandbox-api';
import { TrainingDefinitionInfo, TrainingInstance } from '@crczp/training-model';
import { BehaviorSubject, concat, forkJoin, from, Observable, timer } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { ErrorHandlerService, LoadingTracker, NotificationService, PortalConfig } from '@crczp/utils';
import {
    AdaptiveTrainingDefinitionApi,
    AdaptiveTrainingInstanceApi,
    LinearTrainingDefinitionApi,
    LinearTrainingInstanceApi,
    TrainingDefinitionSort
} from '@crczp/training-api';
import { CommonTrainingInstanceSnapshotService } from './common-training-instance-snapshot.service';
import { createPaginatedResource, QueryParam } from '@crczp/api-common';

/**
 * Basic implementation of layer between component and API service.
 */
export abstract class CommonTrainingInstanceEditService extends CommonTrainingInstanceSnapshotService {
    public readonly hasStarted$: Observable<boolean>;

    /**
     * Currently edited training instance
     */
    trainingInstance$: Observable<TrainingInstance> =
        this.trainingInstanceSubject$
            .asObservable()
            .pipe(filter((ti) => ti !== undefined && ti !== null));

    protected editModeSubject$: BehaviorSubject<boolean> = new BehaviorSubject(
        false,
    );
    editMode$: Observable<boolean> = this.editModeSubject$.asObservable();

    private readonly EMPTY_RESOURCE = createPaginatedResource<any>(
        Number.MAX_SAFE_INTEGER,
    );
    protected releasedTrainingDefinitionsSubject: BehaviorSubject<
        PaginatedResource<TrainingDefinitionInfo>
    > = new BehaviorSubject(this.EMPTY_RESOURCE);
    public releasedTrainingDefinitions$: Observable<
        PaginatedResource<TrainingDefinitionInfo>
    > = this.releasedTrainingDefinitionsSubject.asObservable();
    protected unreleasedTrainingDefinitionsSubject: BehaviorSubject<
        PaginatedResource<TrainingDefinitionInfo>
    > = new BehaviorSubject(this.EMPTY_RESOURCE);
    public unreleasedTrainingDefinitions$: Observable<
        PaginatedResource<TrainingDefinitionInfo>
    > = this.unreleasedTrainingDefinitionsSubject.asObservable();
    protected poolsSubject$: BehaviorSubject<PaginatedResource<Pool>> =
        new BehaviorSubject(this.EMPTY_RESOURCE);
    public pools$: Observable<PaginatedResource<Pool>> =
        this.poolsSubject$.asObservable();
    protected sandboxDefinitionsSubject$: BehaviorSubject<
        PaginatedResource<SandboxDefinition>
    > = new BehaviorSubject(this.EMPTY_RESOURCE);
    public sandboxDefinitions$: Observable<
        PaginatedResource<SandboxDefinition>
    > = this.sandboxDefinitionsSubject$.asObservable();

    private loadingTracker = new LoadingTracker();

    protected constructor(
        private trainingInstanceApi:
            | LinearTrainingInstanceApi
            | AdaptiveTrainingInstanceApi,
        private trainingDefinitionApi:
            | LinearTrainingDefinitionApi
            | AdaptiveTrainingDefinitionApi,
        private poolApi: PoolApi,
        private sandboxDefinitionApi: SandboxDefinitionApi,
        private router: Router,
        private errorHandler: ErrorHandlerService,
        private notificationService: NotificationService,
        private config: PortalConfig,
        private buildInstanceEditUrl: (id: number) => string,
    ) {
        super();
        this.loadingTracker.isLoading$.subscribe((loading) =>
            super.setLoading(loading),
        );
        this.hasStarted$ = timer(1).pipe(
            switchMap(() => this.trainingInstance$),
            map((ti) => ti?.hasStarted()),
        );
    }

    /**
     * Saves/creates training instance or handles error.
     */
    public save(): Observable<void> {
        if (this.editModeSubject$.getValue()) {
            return this.update();
        } else {
            return this.create().pipe(
                switchMap((id) =>
                    from(this.router.navigate([this.buildInstanceEditUrl(id)])),
                ),
                map(() => void 0),
            );
        }
    }

    public getAllTrainingDefinitions(
        offsetPaginationEvent: OffsetPaginationEvent<TrainingDefinitionSort>,
        stateFilter: string,
    ): Observable<PaginatedResource<TrainingDefinitionInfo>> {
        return this.trainingDefinitionApi
            .getAllForOrganizer(offsetPaginationEvent, [
                new QueryParam('state', stateFilter),
            ])
            .pipe(
                tap(
                    (definitions) => {
                        if (stateFilter === 'RELEASED') {
                            this.releasedTrainingDefinitionsSubject.next(
                                definitions,
                            );
                        } else {
                            this.unreleasedTrainingDefinitionsSubject.next(
                                definitions,
                            );
                        }
                    },
                    (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Fetching available training definitions',
                        ),
                ),
            );
    }

    public getAllPools(
        offsetPaginationEvent: OffsetPaginationEvent<PoolSort>,
    ): Observable<PaginatedResource<Pool>> {
        return this.poolApi.getPools(offsetPaginationEvent).pipe(
            tap(
                (pools) => {
                    this.poolsSubject$.next(pools);
                },
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Fetching available pools',
                    ),
            ),
        );
    }

    public getAllSandboxDefinitions(
        offsetPaginationEvent: OffsetPaginationEvent<SandboxDefinitionSort>,
    ): Observable<PaginatedResource<SandboxDefinition>> {
        return this.sandboxDefinitionApi.getAll(offsetPaginationEvent).pipe(
            tap(
                (sandboxDefinitions) => {
                    this.sandboxDefinitionsSubject$.next(sandboxDefinitions);
                },
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Fetching available sandbox definitions',
                    ),
            ),
        );
    }

    public set(trainingInstance: TrainingInstance) {
        super.set(trainingInstance);
        this.editModeSubject$.next(trainingInstance !== null);
    }

    public isLocalEnvironmentAllowed(): boolean {
        return !!this.config.enableLocalMode;
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
                            'Training instance was created',
                        );
                        this.onSaved();
                    },
                    (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Creating training instance',
                        ),
                ),
            ),
        );
    }

    private update(): Observable<void> {
        if (!this.editedSnapshot) {
            this.editedSnapshot = this.trainingInstanceSubject$.getValue();
        }
        const definitionPagination: OffsetPaginationEvent<TrainingDefinitionSort> =
            {
                size: Number.MAX_SAFE_INTEGER,
                page: 0,
                sort: 'title',
                sortDir: 'asc',
            };
        const sandboxDefinitionPagination: OffsetPaginationEvent<SandboxDefinitionSort> =
            {
                size: Number.MAX_SAFE_INTEGER,
                page: 0,
                sort: 'name',
                sortDir: 'asc',
            };
        const poolPagination: OffsetPaginationEvent<PoolSort> = {
            size: Number.MAX_SAFE_INTEGER,
            page: 0,
            sort: 'id',
            sortDir: 'asc',
        };

        const observables: Observable<PaginatedResource<any>>[] = [
            this.getAllTrainingDefinitions(definitionPagination, 'RELEASED'),
            this.getAllTrainingDefinitions(definitionPagination, 'UNRELEASED'),
            this.getAllPools(poolPagination),
        ];
        if (this.config.enableLocalMode) {
            observables.push(
                this.getAllSandboxDefinitions(sandboxDefinitionPagination),
            );
        }

        return this.loadingTracker.trackRequest(() =>
            concat([
                this.trainingInstanceApi.update(this.editedSnapshot).pipe(
                    tap(
                        () => {
                            this.notificationService.emit(
                                'success',
                                'Training instance was successfully saved',
                            );
                            this.onSaved();
                        },
                        (err) => {
                            this.errorHandler.emitAPIError(
                                err,
                                'Editing training instance',
                            );
                        },
                    ),
                ),
                forkJoin(observables),
            ]).pipe(map(() => void 0)),
        );
    }

    private onSaved() {
        this.editModeSubject$.next(true);
        this.trainingInstanceSubject$.next(this.editedSnapshot);
        this.editedSnapshot = null;
    }
}
