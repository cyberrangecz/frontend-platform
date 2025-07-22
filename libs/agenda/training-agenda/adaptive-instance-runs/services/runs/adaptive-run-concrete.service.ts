import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {SandboxAllocationUnitsApi, SandboxInstanceApi,} from '@crczp/sandbox-api';
import {SandboxInstance} from '@crczp/sandbox-model';
import {AdaptiveInstanceApi, AdaptiveRunApi} from '@crczp/training-api';
import {TrainingRun} from '@crczp/training-model';
import {EMPTY, Observable, of} from 'rxjs';
import {switchMap, tap} from 'rxjs/operators';
import {AdaptiveRunService} from './adaptive-run.service';
import {ErrorHandlerService, NotificationService, PortalConfig} from '@crczp/common';

/**
 * Basic implementation of layer between component and API service.
 * Can manually get training runs and poll in regular intervals.
 */
@Injectable()
export class AdaptiveRunConcreteService extends AdaptiveRunService {
    private adaptiveInstanceApi = inject(AdaptiveInstanceApi);
    private adaptiveRunApi = inject(AdaptiveRunApi);
    private sandboxApi = inject(SandboxInstanceApi);
    private sauApi = inject(SandboxAllocationUnitsApi);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    private lastTrainingInstanceId: number;

    constructor() {
        const settings = inject(PortalConfig);

        super(settings.defaultPageSize, settings.polling.pollingPeriodShort);
    }

    /**
     * Gel all adaptive runs for passed id and pagination and updates related observables or handles error
     * @param trainingInstanceId which adaptive runs should be requested
     * @param pagination requested pagination
     */
    getAll(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<TrainingRun>> {
        this.onManualResourceRefresh(pagination, trainingInstanceId);
        return this.adaptiveInstanceApi
            .getAssociatedTrainingRuns(trainingInstanceId, pagination)
            .pipe(
                tap(
                    (runs) => this.resourceSubject$.next(runs),
                    () => this.onGetAllError()
                )
            );
    }

    delete(
        trainingRun: TrainingRun,
        localEnvironment: boolean
    ): Observable<any> {
        return this.displayDeleteSandboxDialog(trainingRun).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? of(result)
                    : EMPTY
            ),
            switchMap(() => this.callApiToDeleteRun(trainingRun)),
            switchMap(() =>
                this.getAll(this.lastTrainingInstanceId, this.lastPagination)
            ),
            switchMap(() => {
                if (localEnvironment) {
                    return of();
                }
                return this.callApiToDeleteSandbox(trainingRun);
            })
        );
    }

    protected refreshResource(): Observable<PaginatedResource<TrainingRun>> {
        this.hasErrorSubject$.next(false);
        return this.adaptiveInstanceApi
            .getAssociatedTrainingRuns(
                this.lastTrainingInstanceId,
                this.lastPagination
            )
            .pipe(tap({error: () => this.onGetAllError()}));
    }

    protected onManualResourceRefresh(
        pagination: OffsetPaginationEvent,
        ...params: any[]
    ): void {
        super.onManualResourceRefresh(pagination, ...params);
        this.lastTrainingInstanceId = params[0];
    }

    private displayDeleteSandboxDialog(
        trainingRun: TrainingRun
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Sandbox Instance',
                    `Do you want to delete sandbox instance and training run of player "${trainingRun?.player?.name}"?`,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private callApiToDeleteSandbox(trainingRun: TrainingRun): Observable<any> {
        let sandboxToDelete: SandboxInstance;
        return this.sandboxApi.getSandbox(trainingRun.sandboxInstanceId).pipe(
            tap((sandbox) => (sandboxToDelete = sandbox)),
            switchMap(() =>
                this.sandboxApi.unlockSandbox(sandboxToDelete.allocationUnitId)
            ),
            switchMap(() =>
                this.sauApi.createCleanupRequest(
                    sandboxToDelete.allocationUnitId
                )
            ),
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Deleting of sandbox instance started'
                    ),
                (err) =>
                    this.errorHandler.emit(err, 'Deleting sandbox instance')
            )
        );
    }

    private callApiToDeleteRun(trainingRun: TrainingRun): Observable<any> {
        return this.adaptiveRunApi.delete(trainingRun.id, true).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Deleting of training run started'
                    ),
                (err) => this.errorHandler.emit(err, 'Deleting training run')
            )
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
