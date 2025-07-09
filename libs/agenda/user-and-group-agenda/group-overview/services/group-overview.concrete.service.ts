import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Router} from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {GroupApi} from '@crczp/user-and-group-api';
import {Group} from '@crczp/user-and-group-model';
import {EMPTY, Observable, of} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {
    UserAndGroupErrorHandler,
    UserAndGroupNavigator,
    UserAndGroupNotificationService,
} from '@crczp/user-and-group-agenda';
import {GroupFilter} from '@crczp/user-and-group-agenda/internal';
import {GroupOverviewService} from './group-overview.service';
import {PortalConfig} from '@crczp/common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get groups and perform operations on them.
 */

@Injectable()
export class GroupOverviewConcreteService extends GroupOverviewService {
    private api = inject(GroupApi);
    private alertService = inject(UserAndGroupNotificationService);
    private dialog = inject(MatDialog);
    private router = inject(Router);
    private navigator = inject(UserAndGroupNavigator);
    private errorHandler = inject(UserAndGroupErrorHandler);

    private lastPagination: OffsetPaginationEvent;
    private lastFilter: string;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets all groups with requested pagination and filters, updates related observables or handles an error
     * @param pagination requested pagination
     * @param filter filter to be applied on groups
     */
    getAll(
        pagination: OffsetPaginationEvent,
        filter: string = null
    ): Observable<PaginatedResource<Group>> {
        this.lastPagination = pagination;
        this.lastFilter = filter;
        this.clearSelection();
        const filters = filter ? [new GroupFilter(filter)] : [];
        this.hasErrorSubject$.next(false);
        return this.api.getAll(pagination, filters).pipe(
            tap(
                (groups) => {
                    this.resourceSubject$.next(groups);
                },
                (err) => {
                    this.errorHandler.emit(err, 'Fetching groups');
                    this.hasErrorSubject$.next(true);
                }
            )
        );
    }

    /**
     * Deletes selected groups, updates related observables or handles error
     * @param group a group-overview to delete
     */
    delete(group: Group): Observable<any> {
        return this.displayConfirmationDialog([group]).pipe(
            switchMap((result) =>
                result ? this.callApiToDelete([group]) : EMPTY
            )
        );
    }

    deleteSelected(): Observable<any> {
        const groups = this.selectedSubject$.getValue();
        return this.displayConfirmationDialog(groups).pipe(
            switchMap((result) =>
                result ? this.callApiToDelete(groups) : EMPTY
            )
        );
    }

    edit(group: Group): Observable<any> {
        this.router.navigate([this.navigator.toGroupEdit(group.id)]);
        return of(true);
    }

    create(): Observable<any> {
        this.router.navigate([this.navigator.toNewGroup()]);
        return of(true);
    }

    private displayConfirmationDialog(groups: Group[]): Observable<boolean> {
        const multipleGroups = groups.length > 1;
        const title = multipleGroups ? 'Remove Groups' : 'Remove Group';
        const message = multipleGroups
            ? `Do you want to remove ${groups.length} selected groups?`
            : `Do you want to remove selected group?`;
        const dialogData = new SentinelConfirmationDialogConfig(
            title,
            message,
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

    private callApiToDelete(
        groups: Group[]
    ): Observable<PaginatedResource<Group>> {
        const ids = groups.map((group) => group.id);
        return this.api.deleteMultiple(ids).pipe(
            tap(
                () => {
                    this.clearSelection();
                    this.alertService.emit('success', 'Groups were deleted');
                },
                (err) => {
                    this.errorHandler.emit(err, 'Deleting groups');
                    this.hasErrorSubject$.next(true);
                }
            ),
            switchMap(() => this.getAll(this.lastPagination, this.lastFilter))
        );
    }
}
