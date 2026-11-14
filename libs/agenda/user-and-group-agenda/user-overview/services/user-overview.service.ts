import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { OffsetPaginationEvent } from '@crczp/utils';
import { UserApi, UserSort } from '@crczp/user-and-group-api';
import { User } from '@crczp/user-and-group-model';
import { EMPTY, from, Observable, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, take, tap, toArray } from 'rxjs/operators';
import { SelectablePaginatedService, UserFilter } from '@crczp/user-and-group-agenda/internal';
import { ErrorHandlerService, FileUploadProgressService, LoadingTracker, NotificationService, PortalConfig } from '@crczp/utils';
import { FileUploadDialog, FileUploadDialogConfig } from '@crczp/components';
import { UsersImportPreview } from '../import-preview/users-import-preview';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get users perform operations to modify them.
 */

@Injectable()
export class UserOverviewService extends SelectablePaginatedService<User> {
    private api = inject(UserApi);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private fileUploadProgressService = inject(FileUploadProgressService);
    private errorHandler = inject(ErrorHandlerService);

    private lastPagination: OffsetPaginationEvent<UserSort>;
    private lastFilter: string;
    private readonly loadingTracker = new LoadingTracker();

    override isLoading$ = this.loadingTracker.isLoading$;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets all users with passed pagination and filters and updates related observables or handles an error
     * @param pagination requested pagination
     * @param filterValue filter to be applied on resources
     */
    getAll(
        pagination?: OffsetPaginationEvent<UserSort>,
        filterValue: string = null,
    ): Observable<OffsetPaginatedResource<User>> {
        this.lastPagination = pagination;
        this.lastFilter = filterValue;
        const filters = filterValue ? [new UserFilter(filterValue)] : [];
        this.hasErrorSubject$.next(false);
        this.clearSelection();
        return this.loadingTracker.trackRequest(() =>
            this.api.getAll(pagination, filters).pipe(
                tap(
                    (users) => {
                        this.resourceSubject$.next(users);
                    },
                    (err) => {
                        this.errorHandler.emitAPIError(err, 'Fetching users');
                        this.hasErrorSubject$.next(true);
                    },
                ),
            ),
        );
    }

    /**
     * Gets user with given user id
     * @param userId user id
     */
    get(userId: number): Observable<User> {
        this.hasErrorSubject$.next(false);
        return this.api.get(userId).pipe(
            tap(
                (_) => _,
                (err) => {
                    this.errorHandler.emitAPIError(
                        err,
                        `Fetching user with id: ${userId}`,
                    );
                    this.hasErrorSubject$.next(true);
                },
            ),
        );
    }

    /**
     * Deletes user, informs about the result and refreshes list of users or handles error
     * @param user user to be deleted
     */
    delete(user: User): Observable<any> {
        return this.displayConfirmationDialog([user]).pipe(
            switchMap((result) =>
                result ? this.callApiToDelete([user]) : EMPTY,
            ),
        );
    }

    deleteSelected(): Observable<any> {
        const users = this.selectedSubject$.getValue();
        return this.displayConfirmationDialog(users).pipe(
            switchMap((result) =>
                result ? this.callApiToDelete(users) : EMPTY,
            ),
        );
    }

    /**
     * Gets OIDC users info
     */
    getLocalOIDCUsers(): Observable<any> {
        return this.api.getLocalOIDCUsers().pipe(
            tap({
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Downloading OIDC users info',
                    ),
            }),
        );
    }

    /**
     * Imports users from the picked files, one request per file in pick order.
     * A failed file is reported by name and does not stop the files after it.
     */
    importUsers(): Observable<any> {
        const dialogConfig: FileUploadDialogConfig = {
            title: 'Import users',
            subtitle: 'Select one or more files to import users',
            preview: new UsersImportPreview(),
            mode: 'multiple',
        };
        const dialogRef = FileUploadDialog.open(this.dialog, dialogConfig);
        return dialogRef.afterClosed().pipe(
            take(1),
            switchMap((files: File[] | null) => {
                if (!files?.length) return EMPTY;
                this.fileUploadProgressService.start();
                return from(files).pipe(
                    concatMap((file) => this.importFile(file)),
                    toArray(),
                    tap((outcomes) => {
                        this.fileUploadProgressService.finish();
                        this.emitImportSuccess(
                            outcomes.filter(Boolean).length,
                        );
                    }),
                    switchMap(() =>
                        this.getAll(this.lastPagination, this.lastFilter),
                    ),
                );
            }),
        );
    }

    private importFile(file: File): Observable<boolean> {
        return this.api.importUsers(file).pipe(
            map(() => true),
            catchError((err) => {
                this.errorHandler.emitAPIError(
                    err,
                    `Importing users from ${file.name}`,
                );
                return of(false);
            }),
        );
    }

    private emitImportSuccess(importedFileCount: number): void {
        if (importedFileCount === 0) return;
        this.notificationService.emit(
            'success',
            importedFileCount === 1
                ? 'Users were imported'
                : `Users were imported from ${importedFileCount} files`,
        );
    }

    private displayConfirmationDialog(users: User[]): Observable<boolean> {
        const multipleUsers = users.length > 1;
        const title = multipleUsers ? 'Delete Users' : 'Delete User';
        const content = multipleUsers
            ? `Do you want to delete ${users.length} selected users?`
            : `Do you want to delete selected user?`;
        const dialogData = new SentinelConfirmationDialogConfig(
            title,
            content,
            'Cancel',
            'Delete',
        );

        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            { data: dialogData },
        );
        return dialogRef
            .afterClosed()
            .pipe(
                map((result) => result === SentinelDialogResultEnum.CONFIRMED),
            );
    }

    private callApiToDelete(users: User[]): Observable<any> {
        const ids = users.map((user) => user.id);
        return this.api.deleteMultiple(ids).pipe(
            tap(
                () => {
                    this.clearSelection();
                    this.notificationService.emit(
                        'success',
                        'Selected users were deleted',
                    );
                },
                (err) => {
                    this.errorHandler.emitAPIError(err, 'Deleting user');
                    this.hasErrorSubject$.next(true);
                },
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilter)),
        );
    }
}
