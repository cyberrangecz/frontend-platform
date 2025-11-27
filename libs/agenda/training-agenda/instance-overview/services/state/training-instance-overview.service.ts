import { DestroyRef, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { PoolApi } from '@crczp/sandbox-api';
import { LinearTrainingInstanceApi, TrainingInstanceSort } from '@crczp/training-api';
import { TrainingInstance } from '@crczp/training-model';
import { combineLatest, EMPTY, NEVER, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { TrainingInstanceFilter } from '../../model/adapters/training-instance-filter';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pool, SandboxInstance } from '@crczp/sandbox-model';

export type PoolError = 'NOT_ASSIGNED' | 'REMOVED';

export type PoolSize =
    | {
          total: number;
          used: number;
      }
    | {
          error: PoolError;
      };

@Injectable()
export class TrainingInstanceOverviewService extends CrczpOffsetElementsPaginatedService<TrainingInstance> {
    private trainingInstanceApi = inject(LinearTrainingInstanceApi);
    private dialog = inject(MatDialog);
    private poolApi = inject(PoolApi);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPagination: OffsetPaginationEvent<TrainingInstanceSort>;
    private lastFilter: string;
    private destroyRef = inject(DestroyRef);

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    getAll(
        pagination: OffsetPaginationEvent<TrainingInstanceSort>,
        filter: string = null,
    ): Observable<OffsetPaginatedResource<TrainingInstance>> {
        this.lastPagination = pagination;
        this.lastFilter = filter;
        this.hasErrorSubject$.next(false);
        const filters = filter ? [new TrainingInstanceFilter(filter)] : [];
        return this.trainingInstanceApi.getAll(pagination, filters).pipe(
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

    create(): Promise<boolean> {
        return this.router.navigate([
            Routing.RouteBuilder.linear_instance.create.build(),
        ]);
    }

    edit(id: number): Promise<boolean> {
        return this.router.navigate([
            Routing.RouteBuilder.linear_instance.instanceId(id).edit.build(),
        ]);
    }

    download(id: number): Observable<boolean> {
        return this.trainingInstanceApi.archive(id).pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Downloading training instance',
                    ),
            }),
        );
    }

    delete(trainingInstance: TrainingInstance): Observable<any> {
        return this.displayDialogToDelete(trainingInstance).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(trainingInstance)
                    : EMPTY,
            ),
        );
    }

    runs(id: number) {
        return this.router.navigate([
            Routing.RouteBuilder.linear_instance.instanceId(id).runs.build(),
        ]);
    }

    token(id: number) {
        return this.router.navigate([
            Routing.RouteBuilder.linear_instance
                .instanceId(id)
                .access_token.build(),
        ]);
    }

    progress(id: number) {
        return this.router.navigate([
            Routing.RouteBuilder.linear_instance
                .instanceId(id)
                .progress.build(),
        ]);
    }

    results(id: number) {
        return this.router.navigate([
            Routing.RouteBuilder.linear_instance.instanceId(id).results.build(),
        ]);
    }

    aggregatedResults(id: number) {
        return this.router.navigate([
            Routing.RouteBuilder.linear_instance
                .instanceId(id)
                .aggregated_results.build(),
        ]);
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
                .pipe(mapToNullIfNotFound<OffsetPaginatedResource<SandboxInstance>>()),
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

    poolExists(poolId: number): Observable<boolean> {
        return this.poolApi.getPool(poolId, [404]).pipe(
            map(() => true),
            catchError((_err) => {
                return of(false);
            }),
        );
    }

    getSshAccess(poolId: number): Observable<boolean> {
        return this.poolApi.getManagementSshAccess(poolId).pipe(
            takeUntilDestroyed(this.destroyRef),
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
        return this.trainingInstanceApi.delete(trainingInstance.id,false,[409]).pipe(
            takeUntilDestroyed(this.destroyRef),
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
            switchMap(() => this.getAll(this.lastPagination, this.lastFilter)),
        );
    }

    private forceDelete(id: number): Observable<any> {
        return this.trainingInstanceApi.delete(id, true).pipe(
            takeUntilDestroyed(this.destroyRef),
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
