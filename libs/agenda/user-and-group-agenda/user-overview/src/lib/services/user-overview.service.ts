import { Injectable, inject } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {UserApi} from '@crczp/user-and-group-api';
import {User} from '@crczp/user-and-group-model';
import {EMPTY, Observable} from 'rxjs';
import {map, switchMap, take, tap} from 'rxjs/operators';
import {SelectablePaginatedService, UserFilter,} from '@crczp/user-and-group-agenda/internal';
import {UsersUploadDialogComponent} from '../components/upload-dialog/users-upload-dialog.component';
import {FileUploadProgressService} from './file-upload/file-upload-progress.service';
import {UserAndGroupErrorHandler, UserAndGroupNotificationService,} from '@crczp/user-and-group-agenda';
import {Settings} from '@crczp/common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get users perform operations to modify them.
 */

@Injectable()
export class UserOverviewService extends SelectablePaginatedService<User> {
    private api = inject(UserApi);
    private dialog = inject(MatDialog);
    private alertService = inject(UserAndGroupNotificationService);
    private fileUploadProgressService = inject(FileUploadProgressService);
    private errorHandler = inject(UserAndGroupErrorHandler);

    private lastPagination: OffsetPaginationEvent;
    private lastFilter: string;

    constructor() {
        const settings = inject(Settings);

        super(settings.DEFAULT_PAGE_SIZE);
    }

    /**
     * Gets all users with passed pagination and filters and updates related observables or handles an error
     * @param pagination requested pagination
     * @param filterValue filter to be applied on resources
     */
    getAll(
        pagination?: OffsetPaginationEvent,
        filterValue: string = null
    ): Observable<PaginatedResource<User>> {
        this.lastPagination = pagination;
        this.lastFilter = filterValue;
        const filters = filterValue ? [new UserFilter(filterValue)] : [];
        this.hasErrorSubject$.next(false);
        this.clearSelection();
        return this.api.getAll(pagination, filters).pipe(
            tap(
                (users) => {
                    this.resourceSubject$.next(users);
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching users');
                    this.hasErrorSubject$.next(true);
                }
            )
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
                    this.errorHandler.emit(
                        err,
                        `Fetching user with id: ${userId}`
                    );
                    this.hasErrorSubject$.next(true);
                }
            )
        );
    }

    /**
     * Deletes user, informs about the result and refreshes list of users or handles error
     * @param user user to be deleted
     */
    delete(user: User): Observable<any> {
        return this.displayConfirmationDialog([user]).pipe(
            switchMap((result) =>
                result ? this.callApiToDelete([user]) : EMPTY
            )
        );
    }

    deleteSelected(): Observable<any> {
        const users = this.selectedSubject$.getValue();
        return this.displayConfirmationDialog(users).pipe(
            switchMap((result) =>
                result ? this.callApiToDelete(users) : EMPTY
            )
        );
    }

    /**
     * Gets OIDC users info
     */
    getLocalOIDCUsers(): Observable<any> {
        return this.api
            .getLocalOIDCUsers()
            .pipe(
                tap({
                    error: (err) =>
                        this.errorHandler.emit(
                            err,
                            'Downloading OIDC users info'
                        ),
                })
            );
    }

    /**
     * Import users
     */
    importUsers(): Observable<any> {
        const dialogRef = this.dialog.open(UsersUploadDialogComponent);
        return dialogRef.componentInstance.onUpload$.pipe(
            take(1),
            tap(() => this.fileUploadProgressService.start()),
            switchMap((file) => this.api.importUsers(file)),
            tap(
                () => {
                    this.alertService.emit('success', 'Users were imported');
                    this.fileUploadProgressService.finish();
                    dialogRef.close();
                },
                (err) => {
                    this.fileUploadProgressService.finish();
                    this.errorHandler.emit(err, 'Importing users');
                }
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilter))
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
            'Delete'
        );

        const dialogRef = this.dialog.open(
            SentinelConfirmationDialogComponent,
            {data: dialogData}
        );
        return dialogRef
            .afterClosed()
            .pipe(
                map((result) => result === SentinelDialogResultEnum.CONFIRMED)
            );
    }

    private callApiToDelete(users: User[]): Observable<any> {
        const ids = users.map((user) => user.id);
        return this.api.deleteMultiple(ids).pipe(
            tap(
                () => {
                    this.clearSelection();
                    this.alertService.emit(
                        'success',
                        'Selected users were deleted'
                    );
                },
                (err) => {
                    this.errorHandler.emit(err, 'Deleting user');
                    this.hasErrorSubject$.next(true);
                }
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilter))
        );
    }
}
