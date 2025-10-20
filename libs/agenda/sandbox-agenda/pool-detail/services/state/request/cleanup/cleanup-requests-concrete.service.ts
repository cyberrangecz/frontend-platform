import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { AllocationRequestSort, CleanupRequestsApi, PoolApi, SandboxAllocationUnitsApi } from '@crczp/sandbox-api';
import { CleanupRequest, Request } from '@crczp/sandbox-model';
import { EMPTY, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { RequestsService } from '../requests.service';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { MatDialog } from '@angular/material/dialog';
import { ErrorHandlerService, NotificationService, PortalConfig } from '@crczp/utils';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get cleanup requests, poll them and perform various operations to modify them.
 */
@Injectable()
export class CleanupRequestsConcreteService extends RequestsService {
    private poolApi = inject(PoolApi);
    private sauApi = inject(SandboxAllocationUnitsApi);
    private cleanupRequestsApi = inject(CleanupRequestsApi);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPoolId: number;

    constructor() {
        const settings = inject(PortalConfig);

        super(settings.defaultPageSize, settings.polling.pollingPeriodShort);
    }

    /**
     * Gets all cleanup requests with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with cleanup requests
     * @param pagination requested pagination
     */
    getAll(
        poolId: number,
        pagination: OffsetPaginationEvent<AllocationRequestSort>,
    ): Observable<OffsetPaginatedResource<Request>> {
        this.onManualResourceRefresh(pagination, poolId);
        return this.poolApi.getCleanupRequests(poolId, pagination).pipe(
            tap(
                (paginatedRequests) =>
                    this.resourceSubject$.next(paginatedRequests),
                (err) => this.onGetAllError(err),
            ),
        );
    }

    cancel(request: CleanupRequest): Observable<any> {
        return this.displayConfirmationDialog(
            request,
            'Cancel',
            'Cancel cleanup request',
            'No',
            'Yes',
        ).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToCancel(request)
                    : EMPTY,
            ),
        );
    }

    /**
     * Deletes a cleanup request, informs about the result and updates list of requests or handles an error
     * @param request a cleanup request to be deleted
     */
    delete(request: CleanupRequest): Observable<any> {
        return this.displayConfirmationDialog(
            request,
            'Delete',
            'delete cleanup',
            'Cancel',
            'Delete',
        ).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(request)
                    : EMPTY,
            ),
        );
    }

    protected onManualResourceRefresh(
        pagination: OffsetPaginationEvent<AllocationRequestSort>,
        ...params: any[]
    ): void {
        super.onManualResourceRefresh(pagination, ...params);
        this.lastPoolId = params[0];
    }

    /**
     * Repeats last get all request for polling purposes
     */
    protected refreshResource(): Observable<OffsetPaginatedResource<Request>> {
        this.hasErrorSubject$.next(false);
        return this.poolApi
            .getCleanupRequests(this.lastPoolId, this.lastPagination)
            .pipe(tap({ error: (err) => this.onGetAllError(err) }));
    }

    private onGetAllError(err: HttpErrorResponse) {
        this.errorHandler.emitAPIError(err, 'Fetching cleanup requests');
        this.hasErrorSubject$.next(true);
    }

    private displayConfirmationDialog(
        request: Request,
        title: string,
        action: string,
        cancelLabel: string,
        confirmLabel: string,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    `${title} cleanup request`,
                    `Do you want to ${action.toLowerCase()} "${request.id}"?`,
                    cancelLabel,
                    confirmLabel,
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToDelete(request: Request): Observable<any> {
        return this.sauApi.deleteCleanupRequest(request.allocationUnitId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Delete cleanup request`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Deleting cleanup request',
                    ),
            ),
            switchMap(() =>
                this.getAll(
                    this.lastPoolId,
                    this
                        .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                ),
            ),
        );
    }

    private callApiToCancel(request: Request): Observable<any> {
        return this.cleanupRequestsApi.cancel(request.id).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        `Cleanup request ${request.id} cancelled`,
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Cancelling cleanup request ' + request.id,
                    ),
            ),
            switchMap(() =>
                this.getAll(
                    this.lastPoolId,
                    this
                        .lastPagination as OffsetPaginationEvent<AllocationRequestSort>,
                ),
            ),
        );
    }
}
