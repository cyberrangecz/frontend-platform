import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {PoolApi} from '@crczp/sandbox-api';
import {LinearTrainingInstanceApi} from '@crczp/training-api';
import {TrainingInstance} from '@crczp/training-model';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {TrainingInstanceFilter} from '../../model/adapters/training-instance-filter';
import {TrainingErrorHandler, TrainingNavigator, TrainingNotificationService,} from '@crczp/training-agenda';
import {TrainingInstanceOverviewService} from './training-instance-overview.service';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {MatDialog} from '@angular/material/dialog';
import {PortalConfig} from '@crczp/common';

@Injectable()
export class TrainingInstanceOverviewConcreteService extends TrainingInstanceOverviewService {
    private trainingInstanceApi = inject(LinearTrainingInstanceApi);
    private dialog = inject(MatDialog);
    private poolApi = inject(PoolApi);
    private router = inject(Router);
    private navigator = inject(TrainingNavigator);
    private notificationService = inject(TrainingNotificationService);
    private errorHandler = inject(TrainingErrorHandler);

    private lastPagination: OffsetPaginationEvent;
    private lastFilter: string;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    getAll(
        pagination: OffsetPaginationEvent,
        filter: string = null
    ): Observable<PaginatedResource<TrainingInstance>> {
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
                    this.errorHandler.emit(err, 'Fetching training instances');
                }
            )
        );
    }

    create(): Observable<any> {
        return of(
            this.router.navigate([this.navigator.toNewTrainingInstance()])
        );
    }

    edit(id: number): Observable<any> {
        return of(
            this.router.navigate([this.navigator.toTrainingInstanceEdit(id)])
        );
    }

    download(id: number): Observable<any> {
        return this.trainingInstanceApi
            .archive(id)
            .pipe(
                tap({
                    error: (err) =>
                        this.errorHandler.emit(
                            err,
                            'Downloading training instance'
                        ),
                })
            );
    }

    delete(trainingInstance: TrainingInstance): Observable<any> {
        return this.displayDialogToDelete(trainingInstance).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(trainingInstance)
                    : EMPTY
            )
        );
    }

    runs(id: number): Observable<any> {
        return of(
            this.router.navigate([this.navigator.toTrainingInstanceRuns(id)])
        );
    }

    token(id: number): Observable<any> {
        return of(
            this.router.navigate([
                this.navigator.toTrainingInstanceAccessToken(id),
            ])
        );
    }

    progress(id: number): Observable<any> {
        return of(
            this.router.navigate([
                this.navigator.toTrainingInstanceProgress(id),
            ])
        );
    }

    results(id: number): Observable<any> {
        return of(
            this.router.navigate([this.navigator.toTrainingInstanceResults(id)])
        );
    }

    aggregatedResults(id: number): Observable<any> {
        return of(
            this.router.navigate([
                this.navigator.toTrainingInstanceAggregatedResults(id),
            ])
        );
    }

    /**
     * Returns size of a pool specified by @poolId and '-' if the pool does not exist.
     * @param poolId ID of a pool
     */
    getPoolSize(poolId: number): Observable<string> {
        return this.poolApi.getPool(poolId).pipe(
            map(
                (pool) => pool.maxSize.toString(),
                (err) => {
                    this.hasErrorSubject$.next(true);
                    this.errorHandler.emit(err, 'Fetching pool size');
                    return EMPTY;
                }
            ),
            catchError((err) => (err.status === 404 ? of('-') : EMPTY))
        );
    }

    poolExists(poolId: number): Observable<boolean> {
        return this.poolApi.getPool(poolId).pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    /**
     * Gets available sandboxes of pool specified by @poolId and returns an empty
     * string if pool does not exist.
     * @param poolId ID of a pool
     */
    getAvailableSandboxes(poolId: number): Observable<string> {
        return this.poolApi
            .getPoolsSandboxes(
                poolId,
                new OffsetPaginationEvent(0, Number.MAX_SAFE_INTEGER, '', 'asc')
            )
            .pipe(
                map(
                    (sandboxes) =>
                        sandboxes.elements
                            .filter((sandbox) => !sandbox.isLocked())
                            .length.toString(),
                    (err) => {
                        this.hasErrorSubject$.next(true);
                        this.errorHandler.emit(
                            err,
                            'Fetching available sandboxes'
                        );
                        return EMPTY;
                    }
                ),
                catchError((err) => {
                    return err.status === 404 ? of('') : EMPTY;
                })
            );
    }

    getSshAccess(poolId: number): Observable<boolean> {
        return this.poolApi.getManagementSshAccess(poolId).pipe(
            catchError((err) => {
                this.errorHandler.emit(err, 'Management SSH Access');
                return EMPTY;
            })
        );
    }

    private displayDialogToDelete(
        trainingInstance: TrainingInstance
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Training Instance',
                    `Do you want to delete training instance "${trainingInstance.title}"?`,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private displayDialogToConfirmForceDelete(
        trainingInstance: TrainingInstance
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
                    'Force delete'
                ),
                maxWidth: '42rem',
            }
        );
        return dialogRef.afterClosed();
    }

    private callApiToDelete(
        trainingInstance: TrainingInstance
    ): Observable<PaginatedResource<TrainingInstance>> {
        return this.trainingInstanceApi.delete(trainingInstance.id).pipe(
            tap(() =>
                this.notificationService.emit(
                    'success',
                    'Training instance was successfully deleted'
                )
            ),
            catchError((err) => {
                if (err && err.status === 409) {
                    return this.displayDialogToConfirmForceDelete(
                        trainingInstance
                    ).pipe(
                        switchMap((result) =>
                            result === SentinelDialogResultEnum.CONFIRMED
                                ? this.forceDelete(trainingInstance.id)
                                : EMPTY
                        )
                    );
                }
                return this.errorHandler.emit(
                    err,
                    'Deleting training instance'
                );
            }),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilter))
        );
    }

    private forceDelete(id: number): Observable<any> {
        return this.trainingInstanceApi.delete(id, true).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Training instance was successfully deleted'
                    ),
                (err) =>
                    this.errorHandler.emit(
                        err,
                        'Force deleting training instance'
                    )
            )
        );
    }
}
