import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { LinearRunApi, LinearTrainingInstanceApi, TrainingRunSort } from '@crczp/training-api';
import { TrainingRun } from '@crczp/training-model';
import { EMPTY, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { SandboxAllocationUnitsApi, SandboxInstanceApi } from '@crczp/sandbox-api';
import { MatDialog } from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { SandboxInstance } from '@crczp/sandbox-model';
import { ErrorHandlerService, NotificationService, PortalConfig } from '@crczp/utils';
import { OffsetPaginatedElementsPollingService } from '@sentinel/common';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of layer between component and API service.
 * Can manually get training runs and poll in regular intervals.
 */
@Injectable()
export class TrainingRunService extends OffsetPaginatedElementsPollingService<
    TrainingRun,
    TrainingRunSort
> {
    private trainingInstanceApi = inject(LinearTrainingInstanceApi);
    private trainingRunApi = inject(LinearRunApi);
    private sauApi = inject(SandboxAllocationUnitsApi);
    private sandboxApi = inject(SandboxInstanceApi);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    private lastTrainingInstanceId: number;

    constructor() {
        const settings = inject(PortalConfig);

        super(settings.defaultPageSize, settings.polling.pollingPeriodShort);
    }

    /**
     * Gel all training runs for passed id and pagination and updates related observables or handles error
     * @param trainingInstanceId which training runs should be requested
     * @param pagination requested pagination
     */
    getAll(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent<TrainingRunSort>,
    ): Observable<OffsetPaginatedResource<TrainingRun>> {
        this.onManualResourceRefresh(pagination, trainingInstanceId);
        return this.trainingInstanceApi
            .getAssociatedTrainingRuns(trainingInstanceId, pagination)
            .pipe(
                tap(
                    (runs) => this.resourceSubject$.next(runs),
                    () => this.onGetAllError(),
                ),
            );
    }

    delete(
        trainingRun: TrainingRun,
        localEnvironment: boolean,
    ): Observable<any> {
        return this.displayDeleteSandboxDialog(trainingRun).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? of(result)
                    : EMPTY,
            ),
            switchMap(() => this.callApiToDeleteRun(trainingRun)),
            switchMap(() =>
                this.getAll(this.lastTrainingInstanceId, this.lastPagination),
            ),
            switchMap(() => {
                if (localEnvironment) {
                    return of();
                }
                return this.callApiToDeleteSandbox(trainingRun);
            }),
        );
    }

    protected refreshResource(): Observable<
        OffsetPaginatedResource<TrainingRun>
    > {
        this.hasErrorSubject$.next(false);
        return this.trainingInstanceApi
            .getAssociatedTrainingRuns(
                this.lastTrainingInstanceId,
                this.lastPagination,
            )
            .pipe(tap({ error: () => this.onGetAllError() }));
    }

    protected onManualResourceRefresh(
        pagination: OffsetPaginationEvent<TrainingRunSort>,
        ...params: any[]
    ): void {
        super.onManualResourceRefresh(pagination, ...params);
        this.lastTrainingInstanceId = params[0];
    }

    private displayDeleteSandboxDialog(
        trainingRun: TrainingRun,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Sandbox Instance',
                    `Do you want to delete sandbox instance and training run of player "${trainingRun?.player?.name}"?`,
                    'Cancel',
                    'Delete',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToDeleteSandbox(trainingRun: TrainingRun): Observable<any> {
        let sandboxToDelete: SandboxInstance;
        return this.sandboxApi.getSandbox(trainingRun.sandboxInstanceId).pipe(
            tap((sandbox) => (sandboxToDelete = sandbox)),
            switchMap(() =>
                this.sandboxApi.unlockSandbox(sandboxToDelete.allocationUnitId),
            ),
            switchMap(() =>
                this.sauApi.createCleanupRequest(
                    sandboxToDelete.allocationUnitId,
                ),
            ),
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Deleting of sandbox instance started',
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Deleting sandbox instance',
                    ),
            ),
        );
    }

    private callApiToDeleteRun(trainingRun: TrainingRun): Observable<any> {
        return this.trainingRunApi.delete(trainingRun.id, true).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Deleting of training run started',
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Deleting training run',
                    ),
            ),
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
