import {inject, Injectable} from '@angular/core';
import {SandboxAllocationUnitsService} from './sandbox-allocation-units.service';
import {BehaviorSubject, combineLatestWith, EMPTY, Observable} from 'rxjs';
import {OffsetPagination, OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {PoolApi, SandboxAllocationUnitsApi} from '@crczp/sandbox-api';
import {SandboxAllocationUnit} from '@crczp/sandbox-model';
import {ResourcePollingService} from '@crczp/sandbox-agenda/internal';
import {map, switchMap, tap} from 'rxjs/operators';
import {HttpErrorResponse} from '@angular/common/http';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {MatDialog} from '@angular/material/dialog';
import {ErrorHandlerService, NotificationService, PortalConfig} from "@crczp/common";

@Injectable()
export class SandboxAllocationUnitsConcreteService extends SandboxAllocationUnitsService {
    private poolApi = inject(PoolApi);
    private sauApi = inject(SandboxAllocationUnitsApi);
    private resourcePollingService = inject(ResourcePollingService);
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
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<SandboxAllocationUnit>> {
        this.lastPagination = pagination;
        this.lastPoolId = poolId;
        const observable$: Observable<
            PaginatedResource<SandboxAllocationUnit>
        > = this.poolApi
            .getPoolsSandboxAllocationUnits(poolId, pagination)
            .pipe(
                combineLatestWith(
                    this.poolApi.getPoolsSandboxes(poolId, pagination)
                ),
                map(([units, sandboxes]) => {
                    units.elements.map((unit) => {
                        const uuid = sandboxes.elements.find(
                            (sandbox) => sandbox.allocationUnitId === unit.id
                        );
                        unit.sandboxUuid = uuid ? uuid.id : '';
                    });
                    return units;
                }),
                tap((paginatedRequests) =>
                    this.unitsSubject$.next(paginatedRequests)
                )
            );
        return this.resourcePollingService
            .startPolling(observable$, this.poolPollingPeriod, this.retryAttempts)
            .pipe(
                tap(
                    (_) => _,
                    (err) => this.onGetAllError(err)
                )
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
                        `Sandbox ${unit.id} updated`
                    ),
                (err) =>
                    this.errorHandler.emit(err, `Updating sandbox ${unit.id}`)
            )
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
                    : EMPTY
            )
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
                    : EMPTY
            )
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
            'unlocked '
        ).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToCleanupUnlocked(poolId, force)
                    : EMPTY
            )
        );
    }

    /**
     * Initializes default resources with given pageSize
     * @param pageSize size of a page for pagination
     */
    protected initSubject(
        pageSize: number
    ): PaginatedResource<SandboxAllocationUnit> {
        return new PaginatedResource(
            [],
            new OffsetPagination(0, 0, pageSize, 0, 0)
        );
    }

    private displayConfirmationDialog(
        poolId: number,
        title: string,
        specifier: string
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    `${title} Cleanup Request`,
                    `Do you want to delete all ${specifier}sandboxes for pool ${poolId}?`,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private onGetAllError(err: HttpErrorResponse) {
        this.errorHandler.emit(err, 'Fetching allocation units');
        this.hasErrorSubject$.next(true);
    }

    private callApiToCleanupMultiple(poolId: number, force: boolean): any {
        return this.handleApiRequests(
            this.poolApi.createMultipleCleanupRequests(poolId, force),
            poolId
        );
    }

    private callApiToCleanupFailed(poolId: number, force: boolean): any {
        return this.handleApiRequests(
            this.poolApi.createFailedCleanupRequests(poolId, force),
            poolId
        );
    }

    private callApiToCleanupUnlocked(poolId: number, force: boolean): any {
        return this.handleApiRequests(
            this.poolApi.createUnlockedCleanupRequests(poolId, force),
            poolId
        );
    }

    private handleApiRequests(request: Observable<any>, poolId: number): any {
        return request.pipe(
            tap({
                next: () =>
                    this.notificationService.emit(
                        'success',
                        `Cleanup request for pool ${poolId}`
                    ),
                error: (err) =>
                    this.errorHandler.emit(
                        err,
                        `Creating cleanup request for pool ${poolId}`
                    ),
            }),
            switchMap(() => this.getAll(this.lastPoolId, this.lastPagination))
        );
    }
}
