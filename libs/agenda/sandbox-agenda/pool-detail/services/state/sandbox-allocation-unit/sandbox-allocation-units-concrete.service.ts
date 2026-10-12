import { inject, Injectable } from '@angular/core';
import { SandboxAllocationUnitsService } from './sandbox-allocation-units.service';
import { BehaviorSubject, combineLatestWith, EMPTY, Observable } from 'rxjs';
import { OffsetPaginationEvent } from '@crczp/utils';
import {
    PoolApi,
    SandboxAllocationUnitsApi,
    SandboxAllocationUnitSort,
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
import { emitPoolCleanupResult } from '@crczp/sandbox-agenda/internal';

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
        this.poolPollingPeriod = settings.polling.pollingPeriodShortMs;
        this.retryAttempts = settings.polling.retryCount;
    }

    /**
     * Gets all sandbox allocation units for pool with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with requests for sandbox allocation units for pool
     * @param pagination requested pagination
     */
    getAll(
        poolId: number,
        pagination: OffsetPaginationEvent<SandboxAllocationUnitSort>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        this.lastPagination = pagination;
        this.lastPoolId = poolId;
        this.hasErrorSubject$.next(false);
        return this.resourcePollingService
            .startPolling(
                this.fetchUnits(poolId, pagination),
                this.poolPollingPeriod,
                this.retryAttempts,
            )
            .pipe(tap({ error: (err) => this.onGetAllError(err) }));
    }

    /**
     * Fetches the sandbox allocation units of a pool once with the pagination last requested and
     * publishes them to the units stream. Starts no poll: the poll of getAll keeps running.
     * Completes without a request when no units were loaded yet.
     * @param poolId id of the pool to refresh; defaults to the pool last requested
     */
    refresh(
        poolId: number = this.lastPoolId,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.lastPagination
            ? this.fetchUnits(poolId, this.lastPagination).pipe(
                  tap({ error: (err) => this.onGetAllError(err) }),
              )
            : EMPTY;
    }

    private fetchUnits(
        poolId: number,
        pagination: OffsetPaginationEvent<SandboxAllocationUnitSort>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.poolApi
            .getPoolsSandboxAllocationUnits(poolId, pagination)
            .pipe(
                combineLatestWith(
                    this.poolApi.getPoolsSandboxes(poolId, {
                        ...pagination,
                        sort: 'allocation_unit_id',
                    }),
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
                tap((paginatedRequests) => {
                    this.unitsSubject$.next(paginatedRequests);
                    this.initialFetchCompletedSubject$.next(true);
                }),
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
     * Cancels the allocations of a pool that have not started yet and removes their units.
     * @param poolId id of the pool
     */
    cancelQueued(poolId: number): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.removeStuckUnits(
            poolId,
            'Cancel Queued Allocations',
            `Do you want to cancel the allocations of pool ${poolId} that have not started yet? Sandboxes being built and built ones stay.`,
            'Cancel Allocations',
            this.poolApi.cancelQueued(poolId),
            (count) =>
                count === 0
                    ? 'No allocation was waiting to start'
                    : `Cancelled ${count} queued allocation${count === 1 ? '' : 's'}`,
        );
    }

    /**
     * Cancels the allocations of a pool whose first stage is running and removes their units from
     * the database, leaving what the stage created in the cloud behind.
     * @param poolId id of the pool
     */
    forceCancelAllocation(poolId: number): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.removeStuckUnits(
            poolId,
            'Force Cancel Allocations',
            `Do you want to cancel the allocations of pool ${poolId} whose first stage is running and remove their sandboxes from the database? What the stage has already created in the cloud stays there and has to be deleted by hand.`,
            'Force Cancel',
            this.poolApi.forceCancelAllocation(poolId),
            (count) =>
                count === 0
                    ? 'No allocation was in its first stage'
                    : `Removed ${count} sandbox${count === 1 ? '' : 'es'} whose allocation was in its first stage; delete their cloud resources by hand`,
        );
    }

    /**
     * Cancels the unfinished cleanups of a pool and removes their units from the database, leaving
     * what the cleanups have not removed from the cloud yet behind.
     * @param poolId id of the pool
     */
    forceCleanup(poolId: number): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.removeStuckUnits(
            poolId,
            'Force Cleanup',
            `Do you want to stop the unfinished cleanups of pool ${poolId} and remove their sandboxes from the database? What the cleanups have not removed from the cloud yet stays there and has to be deleted by hand.`,
            'Force Cleanup',
            this.poolApi.forceCleanup(poolId),
            (count) =>
                count === 0
                    ? 'No cleanup was unfinished'
                    : `Removed ${count} sandbox${count === 1 ? '' : 'es'} whose cleanup was unfinished; delete what is left of them in the cloud by hand`,
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

    /**
     * Asks to confirm a pool maintenance action, then runs it and reports how many units it
     * removed.
     */
    private removeStuckUnits(
        poolId: number,
        title: string,
        question: string,
        confirmLabel: string,
        request$: Observable<number>,
        describeResult: (removedCount: number) => string,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    title,
                    question,
                    'Cancel',
                    confirmLabel,
                ),
            },
        );
        return dialogRef.afterClosed().pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? request$
                    : EMPTY,
            ),
            tap({
                next: (removedCount) =>
                    this.notificationService.emit(
                        'success',
                        describeResult(removedCount),
                    ),
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `${title} in pool ${poolId}`,
                    ),
            }),
            switchMap(() => this.getAll(this.lastPoolId, this.lastPagination)),
        );
    }

    private onGetAllError(err: HttpErrorResponse) {
        this.errorHandler.emitAPIError(err, 'Fetching allocation units');
        this.hasErrorSubject$.next(true);
        this.initialFetchCompletedSubject$.next(true);
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

    private handleApiRequests(
        request: Observable<number[]>,
        poolId: number,
    ): any {
        return request.pipe(
            tap({
                next: (skippedUnitIds) =>
                    emitPoolCleanupResult(
                        this.notificationService,
                        `Cleanup request for pool ${poolId}`,
                        skippedUnitIds,
                    ),
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Creating cleanup request for pool ${poolId}`,
                    ),
            }),
            switchMap(() => this.refresh(poolId)),
        );
    }
}
