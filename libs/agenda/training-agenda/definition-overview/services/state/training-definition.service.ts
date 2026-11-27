import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { OffsetPaginationEvent } from '@crczp/utils';
import {
    TrainingDefinition,
    TrainingDefinitionWithLevels,
    TrainingDefinitionStateEnum
} from '@crczp/training-model';
import { EMPTY, from, Observable, of } from 'rxjs';
import { catchError, concatMap, filter, map, switchMap, take, tap, toArray } from 'rxjs/operators';
import { CloneDialogComponent } from '../../components/clone-dialog/clone-dialog.component';
import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService, FileUploadProgressService, LoadingTracker, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { FileUploadDialog } from '@crczp/components';
import { TrainingDefinitionImportPreview } from '../../import-preview/training-definition-import-preview';
import { LinearTrainingDefinitionApi, TrainingDefinitionSort } from '@crczp/training-api';
import { CrczpOffsetElementsPaginatedService, OffsetPaginatedResource, QueryParam } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can get training definitions and perform various operations to modify them
 */
@Injectable()
export class TrainingDefinitionService extends CrczpOffsetElementsPaginatedService<TrainingDefinition> {
    private api = inject(LinearTrainingDefinitionApi);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private fileUploadProgressService = inject(FileUploadProgressService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPagination: OffsetPaginationEvent<TrainingDefinitionSort>;
    private lastFilters: string;
    private readonly loadingTracker = new LoadingTracker();

    override isLoading$ = this.loadingTracker.isLoading$;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets training definition by @definitionId. Updates related observables or handles an error
     * @param definitionId ID of requested training definition
     */
    get(definitionId: number): Observable<TrainingDefinitionWithLevels> {
        this.hasErrorSubject$.next(false);
        return this.api.get(definitionId);
    }

    /**
     * Gets all training definitions with passed pagination and filter and updates related observables or handles an error
     * @param pagination requested pagination
     * @param filter filter to be applied on training definitions (attribute title)
     */
    getAll(
        pagination: OffsetPaginationEvent<TrainingDefinitionSort>,
        filter: string,
    ): Observable<OffsetPaginatedResource<TrainingDefinition>> {
        this.lastPagination = pagination;
        this.lastFilters = filter;
        const filters = filter ? [new QueryParam('title', filter)] : [];
        this.hasErrorSubject$.next(false);
        return this.loadingTracker.trackRequest(() => this.callApiToGetAll(pagination, filters));
    }

    create(): Observable<boolean> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.linear_definition.create.build(),
            ]),
        );
    }

    edit(trainingDefinitionId: number): Observable<boolean> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.linear_definition
                    .definitionId(trainingDefinitionId)
                    .edit.build(),
            ]),
        );
    }

    preview(trainingDefinitionId: number): Observable<boolean> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.linear_definition
                    .definitionId(trainingDefinitionId)
                    .preview.build(),
            ]),
        );
    }

    showMitreTechniques(): Observable<boolean> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.mitre_techniques.build(),
            ]),
        );
    }

    /**
     * Displays dialog to delete training definition and informs about the result and optionally
     * updates list of training definitions or handles an error
     * @param trainingDefinition training definition to be deleted
     */
    delete(
        trainingDefinition: TrainingDefinition,
    ): Observable<OffsetPaginatedResource<TrainingDefinition>> {
        return this.displayDialogToDelete(trainingDefinition).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(trainingDefinition)
                    : EMPTY,
            ),
        );
    }

    /**
     * Creates a clone of already existing training definition.
     * Informs about the result and updates list of training definitions or handles an error
     * @param trainingDefinition training definition to clone
     */
    clone(
        trainingDefinition: TrainingDefinition,
    ): Observable<OffsetPaginatedResource<TrainingDefinition>> {
        return this.displayCloneDialog(trainingDefinition).pipe(
            switchMap((title) =>
                title !== undefined
                    ? this.callApiToClone(trainingDefinition, title)
                    : EMPTY,
            ),
        );
    }

    /**
     * Downloads training definition description in JSON file, handles error if download fails
     * @param trainingDefinition training definition to be downloaded
     */
    download(trainingDefinition: TrainingDefinition): Observable<any> {
        return this.api.download(trainingDefinition.id).pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Downloading training definition',
                    ),
            }),
        );
    }

    /**
     * Displays dialog to change state of a selected training definition to a new one.
     * Informs about the result and updates list of training definitions or handles an error
     * @param trainingDefinition training definition whose state shall be changed
     * @param newState new state of a training definition
     */
    changeState(
        trainingDefinition: TrainingDefinition,
        newState: TrainingDefinitionStateEnum,
    ): Observable<any> {
        return this.displayChangeStateDialog(trainingDefinition, newState).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToChangeState(trainingDefinition, newState)
                    : EMPTY,
            ),
        );
    }

    /**
     * Creates training definitions by uploading the picked JSON or ZIP files, one request per file
     * in pick order. A failed file is reported by name and does not stop the files after it.
     */
    upload(): Observable<OffsetPaginatedResource<TrainingDefinition>> {
        const dialogRef = FileUploadDialog.open(this.dialog, {
            title: 'Upload training definitions',
            subtitle: 'Select one or more .json or .zip files',
            accept: '.json,.zip',
            preview: new TrainingDefinitionImportPreview(),
            mode: 'multiple',
        });
        return dialogRef.afterClosed().pipe(
            take(1),
            filter((files: File[] | null | undefined) => !!files?.length),
            tap(() => this.fileUploadProgressService.start()),
            switchMap((files) =>
                from(files as File[]).pipe(
                    concatMap((file) => this.uploadFile(file)),
                    toArray(),
                ),
            ),
            tap((outcomes) => {
                this.fileUploadProgressService.finish();
                this.emitUploadSuccess(outcomes.filter(Boolean).length);
            }),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilters)),
        );
    }

    private uploadFile(file: File): Observable<boolean> {
        return this.api.upload(file).pipe(
            map(() => true),
            catchError((err) => {
                const operation = `Uploading training definition ${file.name}`;
                if (err instanceof HttpErrorResponse) {
                    this.errorHandler.emitAPIError(err, operation);
                } else {
                    this.errorHandler.emitFrontendErrorNotification(
                        err instanceof Error ? err.message : String(err),
                        operation,
                    );
                }
                return of(false);
            }),
        );
    }

    private emitUploadSuccess(uploadedFileCount: number): void {
        if (uploadedFileCount === 0) return;
        this.notificationService.emit(
            'success',
            uploadedFileCount === 1
                ? 'Training definition was uploaded'
                : `${uploadedFileCount} training definitions were uploaded`,
        );
    }

    private callApiToGetAll(
        pagination: OffsetPaginationEvent<TrainingDefinitionSort>,
        filters: QueryParam[],
    ): Observable<OffsetPaginatedResource<TrainingDefinition>> {
        return this.api.getAll(pagination, filters).pipe(
            tap(
                (paginatedTrainings) => {
                    this.resourceSubject$.next(paginatedTrainings);
                },
                (err) => {
                    this.hasErrorSubject$.next(true);
                    this.errorHandler.emitAPIError(
                        err,
                        'Fetching training definitions',
                    );
                },
            ),
        );
    }

    private displayDialogToDelete(
        trainingDefinition: TrainingDefinition,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Training Definition',
                    `Do you want to delete training definition "${trainingDefinition.title}"?`,
                    'Cancel',
                    'Delete',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToDelete(
        trainingDefinition: TrainingDefinition,
    ): Observable<OffsetPaginatedResource<TrainingDefinition>> {
        return this.api.delete(trainingDefinition.id).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Training definition was deleted',
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Deleting training definition',
                    ),
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilters)),
        );
    }

    private displayCloneDialog(
        trainingDefinition: TrainingDefinition,
    ): Observable<string> {
        const dialogRef = this.dialog.open(CloneDialogComponent, {
            data: trainingDefinition,
        });
        return dialogRef
            .afterClosed()
            .pipe(
                map((result) =>
                    result && result.title ? result.title : undefined,
                ),
            );
    }

    private callApiToClone(
        trainingDefinition: TrainingDefinition,
        title: string,
    ): Observable<OffsetPaginatedResource<TrainingDefinition>> {
        return this.api.clone(trainingDefinition.id, title).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Training definition was cloned',
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Cloning training definition',
                    ),
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilters)),
        );
    }

    private displayChangeStateDialog(
        trainingDefinition: TrainingDefinition,
        newState: TrainingDefinitionStateEnum,
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Training Definition State Change',
                    `Do you want to change state of training definition from "${trainingDefinition.state}" to "${newState}"?`,
                    'Cancel',
                    'Change',
                ),
            },
        );
        return dialogRef.afterClosed();
    }

    private callApiToChangeState(
        trainingDefinition: TrainingDefinition,
        newState: TrainingDefinitionStateEnum,
    ): Observable<any> {
        return this.api.changeState(trainingDefinition.id, newState).pipe(
            tap(
                () => this.onChangedState(trainingDefinition.id, newState),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Changing training definition state',
                    ),
            ),
        );
    }

    private onChangedState(
        trainingDefinitionId: number,
        newState: TrainingDefinitionStateEnum,
    ) {
        const lastResources = this.resourceSubject$.getValue();
        const changedTd = lastResources.elements.find(
            (td) => td.id === trainingDefinitionId,
        );
        const changedIndex = lastResources.elements.findIndex(
            (td) => td.id === trainingDefinitionId,
        );
        if (changedTd && changedIndex !== -1) {
            changedTd.state = newState;
            lastResources.elements[changedIndex] = changedTd;
            this.resourceSubject$.next(lastResources);
        }
        this.notificationService.emit(
            'success',
            `Training definition state was changed to ${newState}`,
        );
    }
}
