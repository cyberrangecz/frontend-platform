import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { TrainingDefinition, TrainingDefinitionStateEnum, TrainingTypeEnum } from '@crczp/training-model';
import { EMPTY, from, Observable } from 'rxjs';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { CloneDialogComponent } from '../../components/clone-dialog/clone-dialog.component';
import { TrainingDefinitionService } from './training-definition.service';
import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService, FileUploadProgressService, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { FileUploadDialog } from '@crczp/components';
import { TRAINING_TYPE_TOKEN } from '../../../instance-edit/components/training-type-token';
import { AdaptiveTrainingDefinitionApi, LinearTrainingDefinitionApi } from '@crczp/training-api';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can get training definitions and perform various operations to modify them
 */
@Injectable()
export class TrainingDefinitionConcreteService extends TrainingDefinitionService {
    private trainingType: TrainingTypeEnum = inject(TRAINING_TYPE_TOKEN);
    private api =
        this.trainingType === TrainingTypeEnum.LINEAR
            ? inject(LinearTrainingDefinitionApi)
            : inject(AdaptiveTrainingDefinitionApi);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private fileUploadProgressService = inject(FileUploadProgressService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPagination: OffsetPaginationEvent;
    private lastFilters: string;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets training definition by @definitionId. Updates related observables or handles an error
     * @param definitionId ID of requested training definition
     */
    get(definitionId: number): Observable<TrainingDefinition> {
        this.hasErrorSubject$.next(false);
        this.isLoadingSubject$.next(true);
        return this.api.get(definitionId);
    }

    /**
     * Gets all training definitions with passed pagination and filter and updates related observables or handles an error
     * @param pagination requested pagination
     * @param filter filter to be applied on training definitions (attribute title)
     */
    getAll(
        pagination: OffsetPaginationEvent,
        filter: string
    ): Observable<PaginatedResource<TrainingDefinition>> {
        this.lastPagination = pagination;
        this.lastFilters = filter;
        const filters = filter ? [new SentinelFilter('title', filter)] : [];
        this.hasErrorSubject$.next(false);
        this.isLoadingSubject$.next(true);
        return this.callApiToGetAll(pagination, filters);
    }

    create(): Observable<boolean> {
        return from(
            this.router.navigate([this.getRouteRootByType().create.build()])
        );
    }

    edit(trainingDefinitionId: number): Observable<boolean> {
        return from(
            this.router.navigate([
                this.getRouteRootByType()
                    .definitionId(trainingDefinitionId)
                    .edit.build(),
            ])
        );
    }

    preview(trainingDefinitionId: number): Observable<boolean> {
        return from(
            this.router.navigate([
                this.getRouteRootByType()
                    .definitionId(trainingDefinitionId)
                    .preview.build(),
            ])
        );
    }

    showMitreTechniques(): Observable<boolean> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.mitre_techniques.build(),
            ])
        );
    }

    /**
     * Displays dialog to delete training definition and informs about the result and optionally
     * updates list of training definitions or handles an error
     * @param trainingDefinition training definition to be deleted
     */
    delete(
        trainingDefinition: TrainingDefinition
    ): Observable<PaginatedResource<TrainingDefinition>> {
        return this.displayDialogToDelete(trainingDefinition).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToDelete(trainingDefinition)
                    : EMPTY
            )
        );
    }

    /**
     * Creates a clone of already existing training definition.
     * Informs about the result and updates list of training definitions or handles an error
     * @param trainingDefinition training definition to clone
     */
    clone(
        trainingDefinition: TrainingDefinition
    ): Observable<PaginatedResource<TrainingDefinition>> {
        return this.displayCloneDialog(trainingDefinition).pipe(
            switchMap((title) =>
                title !== undefined
                    ? this.callApiToClone(trainingDefinition, title)
                    : EMPTY
            )
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
                        'Downloading training definition'
                    ),
            })
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
        newState: TrainingDefinitionStateEnum
    ): Observable<any> {
        return this.displayChangeStateDialog(trainingDefinition, newState).pipe(
            switchMap((result) =>
                result === SentinelDialogResultEnum.CONFIRMED
                    ? this.callApiToChangeState(trainingDefinition, newState)
                    : EMPTY
            )
        );
    }

    /**
     * Creates a new training definition by uploading a training definition description JSON file.
     * Informs about the result and updates list of training definitions or handles an error
     */
    upload(): Observable<PaginatedResource<TrainingDefinition>> {
        const dialogRef = FileUploadDialog.open(this.dialog, {
            title: 'Upload Training definition',
            mode: 'single',
        });
        return dialogRef.afterClosed().pipe(
            take(1),
            filter((value) => value !== undefined && value !== null),
            tap(() => this.fileUploadProgressService.start()),
            tap((value) => console.log('result', value)),
            switchMap((file) => this.api.upload(file as File)),
            tap(
                () => {
                    this.notificationService.emit(
                        'success',
                        'Training definition was uploaded'
                    );
                    this.fileUploadProgressService.finish();
                    dialogRef.close();
                },
                (err) => {
                    this.fileUploadProgressService.finish();
                    this.errorHandler.emitAPIError(
                        err,
                        'Uploading training definition'
                    );
                    dialogRef.close();
                }
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilters))
        );
    }

    private getRouteRootByType() {
        return this.trainingType === TrainingTypeEnum.LINEAR
            ? Routing.RouteBuilder.linear_definition
            : Routing.RouteBuilder.adaptive_definition;
    }

    private callApiToGetAll(
        pagination: OffsetPaginationEvent,
        filters: SentinelFilter[]
    ): Observable<PaginatedResource<TrainingDefinition>> {
        return this.api.getAll(pagination, filters).pipe(
            tap(
                (paginatedTrainings) => {
                    this.resourceSubject$.next(paginatedTrainings);
                    this.isLoadingSubject$.next(false);
                },
                (err) => {
                    this.hasErrorSubject$.next(true);
                    this.isLoadingSubject$.next(false);
                    this.errorHandler.emitAPIError(
                        err,
                        'Fetching training definitions'
                    );
                }
            )
        );
    }

    private displayDialogToDelete(
        trainingDefinition: TrainingDefinition
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Delete Training Definition',
                    `Do you want to delete training definition "${trainingDefinition.title}"?`,
                    'Cancel',
                    'Delete'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private callApiToDelete(
        trainingDefinition: TrainingDefinition
    ): Observable<PaginatedResource<TrainingDefinition>> {
        return this.api.delete(trainingDefinition.id).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Training definition was deleted'
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Deleting training definition'
                    )
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilters))
        );
    }

    private displayCloneDialog(
        trainingDefinition: TrainingDefinition
    ): Observable<string> {
        const dialogRef = this.dialog.open(CloneDialogComponent, {
            data: trainingDefinition,
        });
        return dialogRef
            .afterClosed()
            .pipe(
                map((result) =>
                    result && result.title ? result.title : undefined
                )
            );
    }

    private callApiToClone(
        trainingDefinition: TrainingDefinition,
        title: string
    ): Observable<PaginatedResource<TrainingDefinition>> {
        return this.api.clone(trainingDefinition.id, title).pipe(
            tap(
                () =>
                    this.notificationService.emit(
                        'success',
                        'Training definition was cloned'
                    ),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Cloning training definition'
                    )
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilters))
        );
    }

    private displayChangeStateDialog(
        trainingDefinition: TrainingDefinition,
        newState: TrainingDefinitionStateEnum
    ): Observable<SentinelDialogResultEnum> {
        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Training Definition State Change',
                    `Do you want to change state of training definition from "${trainingDefinition.state}" to "${newState}"?`,
                    'Cancel',
                    'Change'
                ),
            }
        );
        return dialogRef.afterClosed();
    }

    private callApiToChangeState(
        trainingDefinition: TrainingDefinition,
        newState: TrainingDefinitionStateEnum
    ): Observable<any> {
        return this.api.changeState(trainingDefinition.id, newState).pipe(
            tap(
                () => this.onChangedState(trainingDefinition.id, newState),
                (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Changing training definition state'
                    )
            )
        );
    }

    private onChangedState(
        trainingDefinitionId: number,
        newState: TrainingDefinitionStateEnum
    ) {
        const lastResources = this.resourceSubject$.getValue();
        const changedTd = lastResources.elements.find(
            (td) => td.id === trainingDefinitionId
        );
        const changedIndex = lastResources.elements.findIndex(
            (td) => td.id === trainingDefinitionId
        );
        if (changedTd && changedIndex !== -1) {
            changedTd.state = newState;
            lastResources.elements[changedIndex] = changedTd;
            this.resourceSubject$.next(lastResources);
        }
        this.notificationService.emit(
            'success',
            `Training definition state was changed to ${newState}`
        );
    }
}
