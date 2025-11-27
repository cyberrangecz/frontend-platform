import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { PoolApi } from '@crczp/sandbox-api';
import { AdaptiveTrainingInstanceApi, TrainingInstanceSort } from '@crczp/training-api';
import { TrainingInstance } from '@crczp/training-model';
import { combineLatest, EMPTY, from, NEVER, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { AdaptiveInstanceFilter } from '../../model/adapters/adaptive-instance-filter';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerService, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import {
    CrczpOffsetElementsPaginatedService,
    createInfinitePaginationEvent,
    OffsetPaginatedResource
} from '@crczp/api-common';
import { PoolSize } from '@crczp/training-agenda/instance-overview';
import { Pool, SandboxInstance } from '@crczp/sandbox-model';

@Injectable()
export class AdaptiveInstanceOverviewService extends CrczpOffsetElementsPaginatedService<TrainingInstance> {
    private adaptiveInstanceApi = inject(AdaptiveTrainingInstanceApi);
    private dialog = inject(MatDialog);
    private poolApi = inject(PoolApi);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPagination: OffsetPaginationEvent<TrainingInstanceSort>;
    private lastFilters: string;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    getAll(
        pagination: OffsetPaginationEvent<TrainingInstanceSort>,
        filter: string = null,
    ): Observable<OffsetPaginatedResource<TrainingInstance>> {
        this.lastPagination = pagination;
        this.lastFilters = filter;
        this.hasErrorSubject$.next(false);
        const filters = filter ? [new AdaptiveInstanceFilter(filter)] : [];
        return this.adaptiveInstanceApi.getAll(pagination, filters).pipe(
            tap(
                (resource) => {
                    this.resourceSubject$.next(resource);
                },
                (err) => {
                    this.hasErrorSubject$.next(true);
                    this.errorHandler.emitAPIError(
                        err,
                        'Fetching training instances',
                    );
                },
            ),
        );
    }

    create(): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance.create.build(),
            ]),
        );
    }

    edit(id: number): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(id)
                    .edit.build(),
            ]),
        );
    }

    download(id: number): Observable<any> {
        return this.adaptiveInstanceApi.archive(id).pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Downloading training instance',
                    ),
            }),
        );
    }

    delete(
        trainingInstance: TrainingInstance,
    ): Observable<OffsetPaginatedResource<TrainingInstance>> {
        return this.displayDialogToDelete(trainingInstance).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(trainingInstance)
                    : EMPTY,
            ),
        );
    }

    runs(id: number): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(id)
                    .runs.build(),
            ]),
        );
    }

    token(id: number): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(id)
                    .access_token.build(),
            ]),
        );
    }

    progress(id: number): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(id)
                    .progress.build(),
            ]),
        );
    }

    results(id: number): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.adaptive_instance
                    .instanceId(id)
                    .results.build(),
            ]),
        );
    }

    poolExists(poolId: number): Observable<boolean> {
        return this.poolApi.getPool(poolId).pipe(
            map(() => true),
            catchError(() => of(false)),
        );
    }

    /**
     * Returns observable of PoolSize, holding data about total and used size of a pool or
     * an error if the pool is not assigned or has been removed.
     * @param poolId ID of a pool
     */
    getPoolSize(poolId: number): Observable<PoolSize> {
        const mapToNullIfNotFound = <T>() =>
            catchError<T, Observable<T | null>>((err) => {
                if (err?.status === 404) {
                    return of(null);
                }
                return NEVER as Observable<T | null>;
            });
        return combineLatest([
            this.poolApi
                .getPool(poolId, [404])
                .pipe(mapToNullIfNotFound<Pool>()),
            this.poolApi
                .getPoolsSandboxes(poolId, createInfinitePaginationEvent(), [
                    404,
                ])
                .pipe(
                    mapToNullIfNotFound<
                        OffsetPaginatedResource<SandboxInstance>
                    >(),
                ),
        ]).pipe(
            map(([pool, sandboxes]): PoolSize => {
                if (sandboxes === null || pool === null) {
                    return { error: 'REMOVED' };
                }
                return {
                    total: pool.maxSize,
                    used: sandboxes.elements.filter((sandbox) =>
                        sandbox.isLocked(),
                    ).length,
                };
            }),
        );
    }

    getSshAccess(poolId: number): Observable<boolean> {
        return this.poolApi.getManagementSshAccess(poolId).pipe(
            catchError((err) => {
                this.errorHandler.emitAPIError(err, 'Management SSH Access');
                return EMPTY;
            }),
        );
    }

    private displayDialogToDelete(
        trainingInstance: TrainingInstance,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Training Instance',
                    `Do you want to delete training instance "${trainingInstance.title}"?`,
                    'Cancel',
                    'Delete',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private displayDialogToConfirmForceDelete(
        trainingInstance: TrainingInstance,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Force Delete Training Instance',
                    `A pool is currently assigned to this instance.
        Do you want to force delete training instance "${trainingInstance.title}" ?
        This will unlock the pool and purge its command history.`,
                    'Cancel',
                    'Force delete',
                ),
                maxWidth: '42rem',
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToDelete(
        trainingInstance: TrainingInstance,
    ): Observable<OffsetPaginatedResource<TrainingInstance>> {
        return this.adaptiveInstanceApi.delete(trainingInstance.id, false,[409]).pipe(
            tap(() =>
                this.notificationService.emit(
                    'success',
                    'Training instance was successfully deleted',
                ),
            ),
            catchError((err) => {
                if (err && err.status === 409) {
                    return this.displayDialogToConfirmForceDelete(
                        trainingInstance,
                    ).pipe(
                        switchMap((result) =>
                            result === SentinelDialogResultEnum.CONFIRMED
                                ? this.forceDelete(trainingInstance.id)
                                : EMPTY,
                        ),
                    );
                }
                return this.errorHandler.emitAPIError(
                    err,
                    'Deleting training instance',
                );
            }),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilters)),
        );
    }

    private forceDelete(id: number): Observable<any> {
        return this.adaptiveInstanceApi.delete(id, true).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Training instance was successfully deleted',
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Force deleting training instance',
                    ),
            ),
        );
    }
}
