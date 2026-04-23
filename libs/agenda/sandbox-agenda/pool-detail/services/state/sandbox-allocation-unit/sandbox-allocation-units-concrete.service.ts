import { inject, Injectable } from '@angular/core';
import { SandboxAllocationUnitsService } from './sandbox-allocation-units.service';
import { BehaviorSubject, combineLatestWith, EMPTY, Observable } from 'rxjs';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import {
    PoolApi,
    SandboxAllocationUnitsApi,
    SandboxInstanceSort,
} from '@crczp/sandbox-api';
import { SandboxAllocationUnit } from '@crczp/sandbox-model';
import { map, switchMap, tap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { MatDialog } from '@angular/material/dialog';
import {
    ErrorHandlerService,
    NotificationService,
    PollingService,
    PortalConfig,
} from '@crczp/utils';
import {
    createPaginatedResource,
    OffsetPaginatedResource,
} from '@crczp/api-common';

@Injectable()
export class SandboxAllocationUnitsConcreteService extends SandboxAllocationUnitsService {
    private poolApi = inject(PoolApi);
    private sauApi = inject(SandboxAllocationUnitsApi);
    private resourcePollingService = inject(PollingService);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPoolId: number;
    private poolPollingPeriod: number;
    private retryAttempts: number;

    constructor() {
        const settings = inject(PortalConfig);

        super();
        this.unitsSubject$ = new BehaviorSubject(this.initSubject(10));
        this.units$ = this.unitsSubject$.asObservable();
        this.poolPollingPeriod = settings.polling.pollingPeriodShort;
        this.retryAttempts = settings.polling.retryCount;
    }

    /**
     * Gets all sandbox allocation units for pool with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with requests for sandbox allocation units for pool
     * @param pagination requested pagination
     */
    getAll(
        poolId: number,
        pagination: OffsetPaginationEvent<SandboxInstanceSort>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        this.lastPagination = pagination;
        this.lastPoolId = poolId;
        const observable$: Observable<
            OffsetPaginatedResource<SandboxAllocationUnit>
        > = this.poolApi
            .getPoolsSandboxAllocationUnits(poolId, pagination)
            .pipe(
                combineLatestWith(
                    this.poolApi.getPoolsSandboxes(poolId, pagination),
                ),
                map(([units, sandboxes]) => {
                    units.elements.map((unit) => {
                        const uuid = sandboxes.elements.find(
                            (sandbox) => sandbox.allocationUnitId === unit.id,
                        );
                        unit.sandboxUuid = uuid ? uuid.id : '';
                    });
                    return units;
                }),
                tap((paginatedRequests) =>
                    this.unitsSubject$.next(paginatedRequests),
                ),
            );
        return this.resourcePollingService
            .startPolling(
                observable$,
                this.poolPollingPeriod,
                this.retryAttempts,
            )
            .pipe(
                tap(
                    (_) => _,
                    (err) => this.onGetAllError(err),
                ),
            );
    }

    /**
     * Update an existing allocation unit.
     * @param unit a sandbox allocation unit to update
     */
    update(unit: SandboxAllocationUnit): Observable<SandboxAllocationUnit> {
        return this.sauApi.update(unit).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Sandbox ${unit.id} updated`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Updating sandbox ${unit.id}`,
                    ),
            ),
        );
    }

    /**
     * Starts cleanup requests for all allocation units in a given pool specified by @poolId.
     * @param poolId id of pool for which the cleanup requests are created
     * @param force when set to true force delete is used
     */
    cleanupMultiple(poolId: number, force: boolean): Observable<any> {
        return this.displayConfirmationDialog(poolId, 'Create', '').pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToCleanupMultiple(poolId, force)
                    : EMPTY,
            ),
        );
    }

    /**
     * Starts cleanup requests for all failed allocation units in a given pool specified by @poolId.
     * @param poolId id of pool for which the cleanup requests are created
     * @param force when set to true force delete is used
     */
    cleanupFailed(poolId: number, force: boolean): Observable<any> {
        return this.displayConfirmationDialog(poolId, 'Create', 'failed ').pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToCleanupFailed(poolId, force)
                    : EMPTY,
            ),
        );
    }

    /**
     * Starts cleanup requests for all unlocked allocation units in a given pool specified by @poolId.
     * @param poolId id of pool for which the cleanup requests are created
     * @param force when set to true force delete is used
     */
    cleanupUnlocked(poolId: number, force: boolean): Observable<any> {
        return this.displayConfirmationDialog(
            poolId,
            'Create',
            'unlocked ',
        ).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToCleanupUnlocked(poolId, force)
                    : EMPTY,
            ),
        );
    }

    /**
     * Cancels all queued (IN_QUEUE) allocation units in the given pool.
     */
    cancelQueued(poolId: number): Observable<{ cancelled_count: number }> {
        return this.displayCancelQueuedConfirmationDialog(poolId).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToCancelQueued(poolId)
                    : EMPTY,
            ),
        );
    }

    /**
     * Force-cancels all stuck allocation units (first stage running) in the given pool.
     * Removes them from the Cyber Range DB only; OpenStack must be cleaned up manually.
     */
    forceCancelAllocation(poolId: number): Observable<{ force_cancelled_count: number }> {
        return this.displayForceCancelAllocationConfirmationDialog(poolId).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToForceCancelAllocation(poolId)
                    : EMPTY,
            ),
        );
    }

    /**
     * Force-removes all units in the pool that have a cleanup request that is not finished
     * (cleanup running or stuck). Removes them from the Cyber Range DB only.
     */
    forceCleanup(poolId: number): Observable<{ force_cleaned_count: number }> {
        return this.displayForceCleanupConfirmationDialog(poolId).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToForceCleanup(poolId)
                    : EMPTY,
            ),
        );
    }

    /**
     * Initializes default resources with given pageSize
     * @param pageSize size of a page for pagination
     */
    protected initSubject(
        pageSize: number,
    ): OffsetPaginatedResource<SandboxAllocationUnit> {
        return createPaginatedResource(pageSize);
    }

    private displayConfirmationDialog(
        poolId: number,
        title: string,
        specifier: string,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    `${title} Cleanup Request`,
                    `Do you want to delete all ${specifier}sandboxes for pool ${poolId}?`,
                    'Cancel',
                    'Delete',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private onGetAllError(err: HttpErrorResponse) {
        this.errorHandler.emitAPIError(err, 'Fetching allocation units');
        this.hasErrorSubject$.next(true);
    }

    private callApiToCleanupMultiple(poolId: number, force: boolean): any {
        return this.handleApiRequests(
            this.poolApi.createMultipleCleanupRequests(poolId, force),
            poolId,
        );
    }

    private callApiToCleanupFailed(poolId: number, force: boolean): any {
        return this.handleApiRequests(
            this.poolApi.createFailedCleanupRequests(poolId, force),
            poolId,
        );
    }

    private callApiToCleanupUnlocked(poolId: number, force: boolean): any {
        return this.handleApiRequests(
            this.poolApi.createUnlockedCleanupRequests(poolId, force),
            poolId,
        );
    }

    private displayCancelQueuedConfirmationDialog(
        poolId: number,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Cancel allocation',
                    'Cancel all queued allocations in this pool? Sandboxes that have already started deploying will not be affected.',
                    'Cancel',
                    'Cancel allocation',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private displayForceCancelAllocationConfirmationDialog(
        poolId: number,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Force Cancel Allocation',
                    'Remove all stuck allocations (first stage running) from the Cyber Range? They will be deleted from the database only. You must clean up OpenStack (or other cloud) resources manually.',
                    'Cancel',
                    'Force Cancel',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private displayForceCleanupConfirmationDialog(
        poolId: number,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Force Cleanup',
                    'Remove all sandboxes with stuck cleanup from the Cyber Range? They will be deleted from the database only. Clean up any external resources (OpenStack, jump proxy) manually if needed.',
                    'Cancel',
                    'Force Cleanup',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToCancelQueued(
        poolId: number,
    ): Observable<{ cancelled_count: number }> {
        return this.poolApi.cancelQueued(poolId).pipe(
            tap((res) =>
                this.notificationService.emit(
                    'success',
                    res.cancelled_count === 0
                        ? 'No queued allocations to cancel'
                        : `Cancelled ${res.cancelled_count} queued allocation(s)`,
                ),
            ),
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Cancelling queued allocations for pool ${poolId}`,
                    ),
            }),
            switchMap((res) =>
                this.getAll(
                    this.lastPoolId,
                    this.lastPagination as OffsetPaginationEvent<SandboxInstanceSort>,
                ).pipe(map(() => res)),
            ),
        );
    }

    private callApiToForceCancelAllocation(
        poolId: number,
    ): Observable<{ force_cancelled_count: number }> {
        return this.poolApi.forceCancelAllocation(poolId).pipe(
            tap((res) =>
                this.notificationService.emit(
                    'success',
                    res.force_cancelled_count === 0
                        ? 'No stuck allocations to force-cancel'
                        : `Force-cancelled ${res.force_cancelled_count} stuck allocation(s). Clean up OpenStack resources manually if needed.`,
                ),
            ),
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Force-cancelling stuck allocations for pool ${poolId}`,
                    ),
            }),
            switchMap((res) =>
                this.getAll(
                    this.lastPoolId,
                    this.lastPagination as OffsetPaginationEvent<SandboxInstanceSort>,
                ).pipe(map(() => res)),
            ),
        );
    }

    private callApiToForceCleanup(
        poolId: number,
    ): Observable<{ force_cleaned_count: number }> {
        return this.poolApi.forceCleanup(poolId).pipe(
            tap((res) =>
                this.notificationService.emit(
                    'success',
                    res.force_cleaned_count === 0
                        ? 'No stuck cleanups to force-remove'
                        : `Force-removed ${res.force_cleaned_count} stuck cleanup(s). Clean up external resources manually if needed.`,
                ),
            ),
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Force-cleanup for pool ${poolId}`,
                    ),
            }),
            switchMap((res) =>
                this.getAll(
                    this.lastPoolId,
                    this.lastPagination as OffsetPaginationEvent<SandboxInstanceSort>,
                ).pipe(map(() => res)),
            ),
        );
    }

    private handleApiRequests(request: Observable<any>, poolId: number): any {
        return request.pipe(
            tap({
                next: () =>
                    this.notificationService.emit(
                        'success',
                        `Cleanup request for pool ${poolId}`,
                    ),
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Creating cleanup request for pool ${poolId}`,
                    ),
            }),
            switchMap(() => this.getAll(this.lastPoolId, this.lastPagination)),
        );
    }
}
