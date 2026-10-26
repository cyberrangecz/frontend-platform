import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { OffsetPaginationEvent } from '@crczp/utils';
import {
    AllocationRequestsApi,
    PoolApi,
    SandboxAllocationUnitSort,
    SandboxAllocationUnitsApi,
    SandboxInstanceApi,
    SandboxInstanceSort
} from '@crczp/sandbox-api';
import { SandboxAllocationUnit, SandboxInstance } from '@crczp/sandbox-model';
import { defer, EMPTY, firstValueFrom, from, Observable, of } from 'rxjs';
import { catchError, filter, map, shareReplay, switchMap, tap } from 'rxjs/operators';
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
import { AbstractSandbox } from '../../../model/abstract-sandbox';
import { summarizeRequestCancellation } from '../../../model/allocation-cancellation';

type AllocationUnitsPage = OffsetPaginatedResource<SandboxAllocationUnit>;

/** Status the sandbox service answers with while a sandbox's VPN access is not yet provisioned. */
const VPN_NOT_PROVISIONED_STATUS = 425;

/**
 * Basic implementation of a layer between a component and an API service.
 * Can get sandbox instances and perform various operations to modify them.
 */
@Injectable()
export class SandboxInstanceService extends OffsetPaginatedElementsPollingService<
    SandboxInstance,
    SandboxInstanceSort
> {
    private sandboxApi = inject(SandboxInstanceApi);
    private poolApi = inject(PoolApi);
    private sandboxAllocationUnitsApi = inject(SandboxAllocationUnitsApi);
    private allocationRequestsApi = inject(AllocationRequestsApi);
    private allocationUnitsService = inject(SandboxAllocationUnitsService);

    public readonly isDeleting$: Observable<boolean> =
        this.allocationUnitsService.isDeleting$;

    public allocationUnits$: Observable<
        OffsetPaginatedResource<SandboxAllocationUnit>
    > = this.allocationUnitsService.units$;
    /**
     * True when the latest fetch of the pool's allocation units failed
     */
    public allocationUnitsHasError$: Observable<boolean> =
        this.allocationUnitsService.hasError$;
    override isLoading$: Observable<boolean> =
        this.allocationUnitsService.isLoading$;

    private router = inject(Router);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);
    private lastPoolId: number;

    constructor() {
        const settings = inject(PortalConfig);

        super(settings.defaultPageSize, settings.polling.pollingPeriodShortMs);
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
        pagination: OffsetPaginationEvent<SandboxAllocationUnitSort>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.allocationUnitsService.getAll(poolId, pagination);
    }

    /**
     * Deletes a sandbox instance, informs about the result and updates list of requests or handles an error
     * @param sandboxInstance a sandbox instance to be deleted
     */
    delete(sandboxInstance: SandboxInstance): Observable<AllocationUnitsPage> {
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
    allocate(poolId: number): Observable<AllocationUnitsPage> {
        return this.notifyThenRefresh(
            this.poolApi.allocateSandboxes(poolId),
            `Allocation of pool ${poolId} started`,
            `Allocating pool ${poolId}`,
            poolId,
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
    ): Observable<AllocationUnitsPage> {
        if (total == 1) {
            return this.allocate(poolId);
        }
        return this.getNumberOfSandboxes(total).pipe(
            switchMap((response) =>
                !!response && !!response.result
                    ? this.notifyThenRefresh(
                          this.poolApi.allocateSandboxes(
                              poolId,
                              response.result,
                          ),
                          `Allocation of specified sandboxes of pool ${poolId} started`,
                          `Allocating pool ${poolId}`,
                          poolId,
                      )
                    : EMPTY,
            ),
        );
    }

    /**
     * Retries an allocation of a sandbox instance, informs about the result and updates list of requests or handles an error
     * @param unitId id of a unit for which retry will be performed
     */
    retryAllocate(unitId: number): Observable<AllocationUnitsPage> {
        return this.notifyThenRefresh(
            this.sandboxAllocationUnitsApi.createRetryRequest(unitId),
            `Allocation of sandbox ${unitId} started`,
            `Allocating sandbox ${unitId}`,
        );
    }

    /**
     * Unlocks a sandbox instance making it available for modification.
     * Informs about the result and updates list of requests or handles an error
     * @param allocationUnitId a sandbox instance to be unlocked represented by its id
     */
    unlock(allocationUnitId: number): Observable<AllocationUnitsPage> {
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
    lock(allocationUnitId: number): Observable<AllocationUnitsPage> {
        return this.notifyThenRefresh(
            this.sandboxApi.lockSandbox(allocationUnitId),
            `Sandbox ${allocationUnitId} was locked`,
            `Locking sandbox ${allocationUnitId}`,
        );
    }

    /**
     * Gets zip file that contains configurations, key and script for remote ssh access for user.
     * The request starts on the call and runs to its end whether or not the returned observable
     * stays subscribed.
     * @param sandboxUuid id of the sandbox for which remote ssh access is demanded
     */
    downloadUserSshAccess(sandboxUuid: string): Observable<boolean> {
        const download$ = this.sandboxApi.getUserSshAccess(sandboxUuid).pipe(
            catchError((err) => {
                this.errorHandler.emitAPIError(
                    err,
                    `User SSH Access for sandbox: ${sandboxUuid}`,
                );
                return EMPTY;
            }),
            shareReplay(1),
        );
        download$.subscribe();
        return download$;
    }

    /**
     * Places the command connecting to a sandbox over VPN on the clipboard, reporting the outcome
     * as a notification. A sandbox reachable over no VPN is reported as such and nothing is
     * placed on the clipboard. The lookup, the clipboard write and the reporting start on the call
     * itself and run to their end whether or not the returned observable stays subscribed, so the
     * call must happen within the user gesture requesting the copy.
     *
     * @param sandboxUuid uuid of the sandbox to be reached over VPN
     * @returns Observable emitting true once the command reached the clipboard
     */
    copyVpnCommand(sandboxUuid: string): Observable<boolean> {
        const command$ = this.sandboxApi.getSandboxVpnCommand(sandboxUuid).pipe(
            map((vpnCommand) => vpnCommand.command),
            shareReplay(1),
        );
        const written$ = this.writeToClipboard(
            command$.pipe(filter((command) => command !== null)),
        );

        const outcome$ = command$.pipe(
            switchMap((command) =>
                command === null
                    ? this.reportVpnUnavailable(sandboxUuid)
                    : written$.pipe(
                          tap((copied) => this.reportCopyOutcome(copied)),
                      ),
            ),
            catchError((err: HttpErrorResponse) => {
                if (err.status === VPN_NOT_PROVISIONED_STATUS) {
                    this.notificationService.emit(
                        'warning',
                        'VPN access is still being provisioned',
                        [`Sandbox ${sandboxUuid}`],
                    );
                } else {
                    this.errorHandler.emitAPIError(
                        err,
                        `VPN command for sandbox: ${sandboxUuid}`,
                    );
                }
                return EMPTY;
            }),
            shareReplay(1),
        );
        outcome$.subscribe();
        return outcome$;
    }

    /**
     * Starts writing the first text a source emits to the clipboard at once, ahead of the text
     * itself arriving.
     *
     * @param text$ source of the text to be written
     * @returns Observable emitting whether the text reached the clipboard; false also where the
     * source fails or completes empty
     */
    private writeToClipboard(text$: Observable<string>): Observable<boolean> {
        const textBlob = firstValueFrom(
            text$.pipe(map((text) => new Blob([text], { type: 'text/plain' }))),
        );
        return from(
            navigator.clipboard
                .write([new ClipboardItem({ 'text/plain': textBlob })])
                .then(
                    () => true,
                    () => false,
                ),
        );
    }

    private reportVpnUnavailable(sandboxUuid: string): Observable<boolean> {
        this.notificationService.emit(
            'warning',
            'VPN connection unavailable',
            [`Sandbox ${sandboxUuid} has no VPN access configured`],
        );
        return of(false);
    }

    private reportCopyOutcome(copied: boolean): void {
        if (copied) {
            this.notificationService.emit(
                'success',
                'VPN connection command copied',
            );
        } else {
            this.notificationService.emit(
                'error',
                'Copying the VPN connection command failed',
            );
        }
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
    cleanupMultiple(
        poolId: number,
        force: boolean,
    ): Observable<AllocationUnitsPage> {
        return this.allocationUnitsService.cleanupMultiple(poolId, force);
    }

    /**
     * Starts cleanup requests for all failed allocation requests for pool specified by @poolId.
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    cleanupFailed(
        poolId: number,
        force: boolean,
    ): Observable<AllocationUnitsPage> {
        return this.allocationUnitsService.cleanupFailed(poolId, force);
    }

    /**
     * Starts cleanup requests for all unlocked allocation requests for pool specified by @poolId.
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    cleanupUnlocked(
        poolId: number,
        force: boolean,
    ): Observable<AllocationUnitsPage> {
        return this.allocationUnitsService.cleanupUnlocked(poolId, force);
    }

    /**
     * Asks to confirm stopping every unfinished allocation of the pool, then stops them and
     * refreshes the units.
     * @param poolId id of the pool
     */
    cancelAllocations(
        poolId: number,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return this.allocationUnitsService.trackDeletion(() =>
            this.refreshUnitsAfter(
                this.allocationUnitsService.cancelAllocations(poolId),
            ),
        );
    }

    /**
     * Asks to confirm stopping the unfinished allocation of one unit, then cancels its allocation
     * request, informs about the result and refreshes the units.
     * @param unit unit whose allocation is cancelled
     */
    cancelBuild(
        unit: AbstractSandbox,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        const requestId = unit.allocationRequest.id;
        const cancellation$ = defer(() =>
            this.dialog
                .open(SentinelConfirmationDialogComponent, {
                    data: new SentinelConfirmationDialogConfig(
                        `Cancel build of sandbox ${unit.id}?`,
                        `Allocation request ${requestId} is stopped. Other allocations of the pool continue.`,
                        'Keep build',
                        'Cancel build',
                    ),
                })
                .afterClosed(),
        ).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.allocationRequestsApi.cancel(requestId)
                    : EMPTY,
            ),
            tap({
                next: ({ stopPending }) => {
                    const summary = summarizeRequestCancellation(
                        'Allocation',
                        requestId,
                        stopPending,
                    );
                    this.notificationService.emit(summary.type, summary.title);
                },
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        `Cancelling allocation request ${requestId}`,
                    ),
            }),
        );
        return this.allocationUnitsService.trackDeletion(() =>
            this.refreshUnitsAfter(cancellation$),
        );
    }

    private refreshUnitsAfter(
        action$: Observable<unknown>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>> {
        return action$.pipe(
            switchMap(() => this.allocationUnitsService.refresh()),
        );
    }

    /**
     * Starts cleanup for sandbox specified in @unitIds.
     * @param unitId allocation unit id which should be deleted
     */
    createCleanup(unitId: number): Observable<AllocationUnitsPage> {
        return this.deleteUnit(unitId, unitId);
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
        // TODO Cleanup request navigation
        return this.navigateToAllocation(poolId, sandboxId, stageOrder);
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

    private navigateToAllocation(
        poolId: number,
        sandboxId: number,
        stageOrder: number,
    ): Observable<boolean> {
        return from(
            this.router.navigate(
                [
                    Routing.RouteBuilder.pool
                        .poolId(poolId)
                        .sandbox_instance.requestId(sandboxId)
                        .build(),
                ],
                {
                    fragment: `stage-${stageOrder + 1}`,
                },
            ),
        );
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
                    `Do you want to ${action.toLowerCase()} sandbox ${id}?`,
                    'Cancel',
                    action,
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToUnlock(
        allocationUnitId: number,
    ): Observable<AllocationUnitsPage> {
        return this.notifyThenRefresh(
            this.sandboxApi.unlockSandbox(allocationUnitId),
            `Sandbox ${allocationUnitId} was unlocked`,
            `Unlocking sandbox ${allocationUnitId}`,
        );
    }

    private callApiToDelete(
        sandboxInstance: SandboxInstance,
    ): Observable<AllocationUnitsPage> {
        return this.deleteUnit(
            sandboxInstance.allocationUnitId,
            sandboxInstance.id,
        );
    }

    /**
     * Deletes an allocation unit so that the request and the refresh following it count towards
     * the deletion state of the units, and informs about the result.
     * @param allocationUnitId id of the allocation unit to delete
     * @param shownId id of the sandbox named in the notifications
     */
    private deleteUnit(
        allocationUnitId: number,
        shownId: number | string,
    ): Observable<AllocationUnitsPage> {
        return this.allocationUnitsService.trackDeletion(() =>
            this.notifyThenRefresh(
                this.sandboxAllocationUnitsApi.createCleanupRequest(
                    allocationUnitId,
                ),
                `Sandbox ${shownId} was deleted`,
                `Deleting sandbox ${shownId}`,
            ),
        );
    }

    /**
     * Reports the outcome of a request and, once it succeeds, refreshes the allocation units once.
     * @param request$ request whose outcome is reported
     * @param successMessage notification text shown when the request succeeds
     * @param failureContext description of the request given to the error notification
     * @param poolId pool whose units are refreshed; defaults to the pool last loaded
     */
    private notifyThenRefresh(
        request$: Observable<unknown>,
        successMessage: string,
        failureContext: string,
        poolId?: number,
    ): Observable<AllocationUnitsPage> {
        return request$.pipe(
            tap({
                next: () =>
                    this.notificationService.emit('success', successMessage),
                error: (err) =>
                    this.errorHandler.emitAPIError(err, failureContext),
            }),
            switchMap(() => this.allocationUnitsService.refresh(poolId)),
        );
    }

    private onGetAllError(err: HttpErrorResponse) {
        this.errorHandler.emitAPIError(err, 'Fetching sandbox instances');
        this.hasErrorSubject$.next(true);
    }
}
