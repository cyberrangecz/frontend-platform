import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { CheatingDetectionApi } from '@crczp/training-api';
import { CheatingDetection } from '@crczp/training-model';
import { EMPTY, from, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { CheatingDetectionService } from './cheating-detection.service';
import { ErrorHandlerService, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class CheatingDetectionConcreteService extends CheatingDetectionService {
    private api = inject(CheatingDetectionApi);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPagination: OffsetPaginationEvent;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets all cheating detections with passed pagination and filter and updates related observables or handles an error
     * @param trainingInstanceId training instance id
     * @param pagination requested pagination
     */
    getAll(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<CheatingDetection>> {
        return this.api.getAll(pagination, trainingInstanceId).pipe(
            tap(
                (detections) => {
                    this.resourceSubject$.next(detections);
                },
                () => this.onGetAllError()
            )
        );
    }

    /**
     * Moves to a page for cheating detection creation
     * @param trainingInstanceId
     */
    toCreatePage(trainingInstanceId: number): Observable<boolean> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.linear_instance
                    .instanceId(trainingInstanceId)
                    .cheating_detection.create.build(),
            ])
        );
    }

    /**
     * Moves to a page for cheating detection events summary
     * @param trainingInstanceId the training instance id
     * @param cheatingDetectionId the cheating detection id
     */
    toDetectionEventsOfCheatingDetection(
        trainingInstanceId: number,
        cheatingDetectionId: number
    ): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.linear_instance
                    .instanceId(trainingInstanceId)
                    .cheating_detection.detectionId(cheatingDetectionId)
                    .build(),
            ])
        );
    }

    /**
     * Displays dialog to delete cheating detections and informs about the result and optionally
     * updates list of cheating detections or handles an error
     * @param cheatingDetectionId cheating detection to be deleted
     */
    delete(
        cheatingDetectionId: number,
        trainingInstanceId: number
    ): Observable<any> {
        return this.displayDialogToDelete(cheatingDetectionId).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(
                          cheatingDetectionId,
                          trainingInstanceId
                      )
                    : EMPTY
            )
        );
    }

    /**
     * Reruns detections of the specified cheating detection
     * @param cheatingDetectionId cheating detection id
     * @param trainingInstanceId id of training instance
     */
    rerun(
        cheatingDetectionId: number,
        trainingInstanceId: number
    ): Observable<any> {
        return this.api.rerun(cheatingDetectionId, trainingInstanceId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Cheating Detection was re-executed.'
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Executing cheating detection rerun'
                    )
            )
        );
    }

    /**
     * Creates and executed a new cheating detection
     * @param cheatingDetection the cheating detection
     */
    public createAndExecute(
        cheatingDetection: CheatingDetection
    ): Observable<any> {
        return this.api.createAndExecute(cheatingDetection).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Cheating Detection was executed'
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Creating and executing cheating detection'
                    )
            )
        );
    }

    public download(cheatingDetectionId: number): Observable<any> {
        return this.api.archive(cheatingDetectionId).pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Downloading cheating detection'
                    ),
            })
        );
    }

    private displayDialogToDelete(
        cheatingDetectionId: number
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Cheating Detection',
                    `Do you want to delete cheating detection "${cheatingDetectionId}"?`,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private callApiToDelete(
        cheatingDetectionId: number,
        trainingInstanceId: number
    ): Observable<PaginatedResource<CheatingDetection>> {
        return this.api.delete(cheatingDetectionId, trainingInstanceId).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Cheating Detection was deleted'
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Deleting cheating detection'
                    )
            ),
            switchMap(() =>
                this.getAll(trainingInstanceId, this.lastPagination)
            )
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
