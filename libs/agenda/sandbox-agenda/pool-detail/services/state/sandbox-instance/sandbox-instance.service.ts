import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import {
    AllocationRequestSort,
    PoolApi,
    SandboxAllocationUnitsApi,
    SandboxInstanceApi,
    SandboxInstanceSort
} from '@crczp/sandbox-api';
import { SandboxAllocationUnit, SandboxInstance } from '@crczp/sandbox-model';
import { EMPTY, from, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { SandboxAllocationUnitsService } from '../sandbox-allocation-unit/sandbox-allocation-units.service';
import { ErrorHandlerService, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { OffsetPaginatedElementsPollingService } from '@sentinel/common';
import {
    AllocateVariableSandboxesDialogResult
} from '../../../components/allocate-variable-sandboxes/allocateVariableSandboxesDialogResult';
import {
    AllocateVariableSandboxesDialogComponent
} from '../../../components/allocate-variable-sandboxes/allocate-variable-sandboxes-dialog.component';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can get sandbox instances and perform various operations to modify them.
 */
@Injectable()
export class SandboxInstanceService extends OffsetPaginatedElementsPollingService<
    SandboxInstance,
    SandboxInstanceSort
> {
    public allocationUnits$: Observable<
        OffsetPaginatedResource<SandboxAllocationUnit>
    >;

    private sandboxApi = inject(SandboxInstanceApi);
    private poolApi = inject(PoolApi);
    private sandboxAllocationUnitsApi = inject(SandboxAllocationUnitsApi);
    private allocationUnitsService = inject(SandboxAllocationUnitsService);
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);
    private lastPoolId: number;

    constructor() {
        const settings = inject(PortalConfig);

        super(settings.defaultPageSize, settings.polling.pollingPeriodShort);
        const allocationUnitsService = this.allocationUnitsService;

        this.allocationUnits$ = allocationUnitsService.units$;
    }

    /**
     * Gets all sandbox instances with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with sandbox instances
     * @param pagination requested pagination
     */
    getAllSandboxes(
        poolId: number,
        pagination: OffsetPaginationEvent<SandboxInstanceSort>,
    ): Observable<OffsetPaginatedResource<SandboxInstance>> {
        this.onManualResourceRefresh(pagination, poolId);
        return this.sandboxApi.getSandboxes(poolId, pagination).pipe(
            tap(
                (paginatedInstances) => {
                    this.resourceSubject$.next(paginatedInstances);
                },
                (err) => this.onGetAllError(err),
            ),
        );
    }

    /**
     * Gets all sandbox allocation units for pool with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with requests for sandbox allocation units for pool
     * @param pagination requested pagination
     */
    getAllUnits(
        poolId: number,
        pagination: OffsetPaginationEvent<AllocationRequestSort>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        this.lastPoolId = poolId;
        return this.allocationUnitsService.getAll(poolId, pagination);
    }

    /**
     * Deletes a sandbox instance, informs about the result and updates list of requests or handles an error
     * @param sandboxInstance a sandbox instance to be deleted
     */
    delete(sandboxInstance: SandboxInstance): Observable<any> {
        return this.displayConfirmationDialog(
            sandboxInstance.id,
            'Delete',
        ).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(sandboxInstance)
                    : EMPTY,
            ),
        );
    }

    /**
     * Starts an allocation of a sandbox instance, informs about the result and updates list of requests or handles an error
     * @param poolId id of a pool in which the allocation will take place
     */
    allocate(
        poolId: number,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.poolApi.allocateSandboxes(poolId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Allocation of pool ${poolId} started`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Allocating pool ${poolId}`,
                    ),
            ),
            switchMap(() => {
                this.lastPoolId = this.lastPoolId ?? poolId;
                return this.getAllUnits(
                    this.lastPoolId,
                    this
                        .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                );
            }),
        );
    }

    /**
     * Starts an allocation of specified number of sandboxes of a sandbox instance,
     * informs about the result and updates list of requests or handles an error
     * @param poolId id of a pool in which the allocation will take place
     * @param total number of sandboxes that are left to allocate
     */
    allocateSpecified(
        poolId: number,
        total: number,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        if (total == 1) {
            return this.allocate(poolId);
        }
        return this.getNumberOfSandboxes(total).pipe(
            switchMap((result) =>
                result.result !== null
                    ? this.poolApi
                          .allocateSandboxes(poolId, result.result)
                          .pipe(
                              tap(
                                  () =>
                                      this.notificationService.emit(
                                          'success',
                                          `Allocation of specified sandboxes of pool ${poolId} started`,
                                      ),
                                  (err) =>
                                      this.errorHandler.emitAPIError(
                                          err,
                                          `Allocating pool ${poolId}`,
                                      ),
                              ),
                              switchMap(() => {
                                  this.lastPoolId = this.lastPoolId ?? poolId;
                                  return this.getAllUnits(
                                      this.lastPoolId,
                                      this
                                          .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                                  );
                              }),
                          )
                    : EMPTY,
            ),
        );
    }

    /**
     * Retries an allocation of a sandbox instance, informs about the result and updates list of requests or handles an error
     * @param unitId id of a unit for which retry will be performed
     */
    retryAllocate(unitId: number): Observable<any> {
        return this.sandboxAllocationUnitsApi.createRetryRequest(unitId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Allocation of sandbox ${unitId} started`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Allocating sandbox ${unitId}`,
                    ),
            ),
            switchMap(() =>
                this.getAllUnits(
                    this.lastPoolId,
                    this
                        .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                ),
            ),
        );
    }

    /**
     * Unlocks a sandbox instance making it available for modification.
     * Informs about the result and updates list of requests or handles an error
     * @param allocationUnitId a sandbox instance to be unlocked represented by its id
     */
    unlock(allocationUnitId: number): Observable<any> {
        return this.displayConfirmationDialog(allocationUnitId, 'Unlock').pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToUnlock(allocationUnitId)
                    : EMPTY,
            ),
        );
    }

    /**
     * Lock a sandbox instance making it unavailable for modification and save for usage.
     * Informs about the result and updates list of requests or handles an error
     * @param allocationUnitId a sandbox instance to be unlocked represented by its id
     */
    lock(
        allocationUnitId: number,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.sandboxApi.lockSandbox(allocationUnitId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Sandbox ${allocationUnitId} was locked`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Locking sandbox ${allocationUnitId}`,
                    ),
            ),
            switchMap(() =>
                this.getAllUnits(
                    this.lastPoolId,
                    this
                        .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                ),
            ),
        );
    }

    /**
     * Gets zip file that contains configurations, key and script for remote ssh access for user
     * @param sandboxUuid id of the sandbox for which remote ssh access is demanded
     */
    getUserSshAccess(sandboxUuid: string): Observable<boolean> {
        return this.sandboxApi.getUserSshAccess(sandboxUuid).pipe(
            catchError((err) => {
                this.errorHandler.emitAPIError(
                    err,
                    `User SSH Access for sandbox: ${sandboxUuid}`,
                );
                return EMPTY;
            }),
        );
    }

    /**
     * Redirects to topology associated with given allocation unit of the given pool
     * @param poolId id of the pool
     * @param sandboxUuid uuid of the sandbox
     */
    showTopology(poolId: number, sandboxUuid: string): Observable<boolean> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.pool
                    .poolId(poolId)
                    .sandbox_instance.sandboxInstanceId(sandboxUuid)
                    .topology.build(),
            ]),
        );
    }

    /**
     * Starts cleanup for all allocation units in pool identified by @poolId
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    cleanupMultiple(poolId: number, force: boolean): Observable<any> {
        return this.allocationUnitsService
            .cleanupMultiple(poolId, force)
            .pipe(
                switchMap(() =>
                    this.getAllUnits(
                        this.lastPoolId,
                        this
                            .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                    ),
                ),
            );
    }

    /**
     * Starts cleanup requests for all failed allocation requests for pool specified by @poolId.
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    cleanupFailed(poolId: number, force: boolean): Observable<any> {
        return this.allocationUnitsService
            .cleanupFailed(poolId, force)
            .pipe(
                switchMap(() =>
                    this.getAllUnits(
                        this.lastPoolId,
                        this
                            .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                    ),
                ),
            );
    }

    /**
     * Starts cleanup requests for all unlocked allocation requests for pool specified by @poolId.
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    cleanupUnlocked(poolId: number, force: boolean): Observable<any> {
        return this.allocationUnitsService
            .cleanupUnlocked(poolId, force)
            .pipe(
                switchMap(() =>
                    this.getAllUnits(
                        this.lastPoolId,
                        this
                            .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                    ),
                ),
            );
    }

    /**
     * Starts cleanup for sandbox specified in @unitIds.
     * @param unitId allocation unit id which should be deleted
     */
    createCleanup(unitId: number): Observable<any> {
        return this.sandboxAllocationUnitsApi.createCleanupRequest(unitId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Sandbox ${unitId} was deleted`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Deleting sandbox ${unitId}`,
                    ),
            ),
            switchMap(() =>
                this.getAllUnits(
                    this.lastPoolId,
                    this
                        .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                ),
            ),
        );
    }

    /**
     * Redirects to desired detail of stage of the allocation unit.
     * @param poolId id of the pool
     * @param sandboxId id of allocation unit
     * @param stageOrder order of desired stage
     */
    navigateToStage(
        poolId: number,
        sandboxId: number,
        stageOrder: number,
    ): Observable<boolean> {
        let path;
        switch (stageOrder) {
            case 0:
            case 1:
            case 2:
                path = Routing.RouteBuilder.pool
                    .poolId(poolId)
                    .sandbox_instance.requestId(sandboxId)
                    .build();
                break;
            default:
                path = '';
        }
        return path !== ''
            ? from(
                  this.router.navigate([path], {
                      fragment: `stage-${stageOrder}`,
                  }),
              )
            : of(false);
    }

    updateComment(
        allocationUnit: SandboxAllocationUnit,
    ): Observable<SandboxAllocationUnit> {
        return this.sandboxAllocationUnitsApi.update(allocationUnit).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Comment for sandbox ${allocationUnit.id} was updated`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Updating comment for sandbox ${allocationUnit.id}`,
                    ),
            ),
        );
    }

    protected onManualResourceRefresh(
        pagination: OffsetPaginationEvent<SandboxInstanceSort>,
        ...params: any[]
    ): void {
        super.onManualResourceRefresh(pagination);
        this.lastPoolId = params[0];
    }

    protected refreshResource(): Observable<
        OffsetPaginatedResource<SandboxInstance>
    > {
        this.hasErrorSubject$.next(false);
        return this.sandboxApi
            .getSandboxes(this.lastPoolId, this.lastPagination)
            .pipe(tap({ error: (err) => this.onGetAllError(err) }));
    }

    private getNumberOfSandboxes(
        maximum: number,
    ): Observable<AllocateVariableSandboxesDialogResult> {
        const dialogRef = this.dialog.open(
            AllocateVariableSandboxesDialogComponent,
            {
                data: maximum,
                width: 'auto',
                height: 'auto',
            },
        );
        return dialogRef.afterClosed();
    }

    private displayConfirmationDialog(
        id: number | string,
        action: string,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    `${action} sandbox`,
                    `Do you want to ${action} sandbox ${id}"?`,
                    'Cancel',
                    action,
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToUnlock(
        allocationUnitId: number,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.sandboxApi.unlockSandbox(allocationUnitId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Sandbox ${allocationUnitId} was unlocked`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Unlocking sandbox ${allocationUnitId}`,
                    ),
            ),
            switchMap(() =>
                this.getAllUnits(
                    this.lastPoolId,
                    this
                        .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                ),
            ),
        );
    }

    private callApiToDelete(
        sandboxInstance: SandboxInstance,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.sandboxAllocationUnitsApi
            .createCleanupRequest(sandboxInstance.allocationUnitId)
            .pipe(
                tap(
                    () =>
                        this.notificationService.emit(
                            'success',
                            `Sandbox ${sandboxInstance.id} was deleted`,
                        ),
                    (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            `Deleting sandbox ${sandboxInstance.id}`,
                        ),
                ),
                switchMap(() =>
                    this.getAllUnits(
                        this.lastPoolId,
                        this
                            .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                    ),
                ),
            );
    }

    private onGetAllError(err: HttpErrorResponse) {
        this.errorHandler.emitAPIError(err, 'Fetching sandbox instances');
        this.hasErrorSubject$.next(true);
    }
}
