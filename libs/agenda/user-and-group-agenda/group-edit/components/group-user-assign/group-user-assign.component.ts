import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { Group, User } from '@crczp/user-and-group-model';
import { SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import {
    SentinelResourceSelectorComponent,
    SentinelResourceSelectorMapping
} from '@sentinel/components/resource-selector';
import { combineLatest, defer, Observable, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { DeleteControlItem, SaveControlItem } from '@crczp/user-and-group-agenda/internal';
import { UserAssignService } from '../../services/state/user-assign.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard, MatCardAvatar, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { OffsetPaginationEvent, PaginationStorageService, providePaginationStorageService, SortDir } from '@crczp/utils';
import { UserSort } from '@crczp/user-and-group-api';
import { AsyncPipe } from '@angular/common';
import { PaginationMapper } from '@crczp/api-common';
import { GroupMemberTable } from '../../model/table/group-member-table';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';

/**
 * Component for user assignment to groups
 */
@Component({
    selector: 'crczp-group-user-assign',
    templateUrl: './group-user-assign.component.html',
    styleUrls: ['./group-user-assign.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardContent,
        MatCardHeader,
        MatCardAvatar,
        MatIcon,
        SentinelControlsComponent,
        MatCardTitle,
        MatCardSubtitle,
        AsyncPipe,
        SentinelTableComponent,
        SentinelFilterFreeInputComponent,
        SentinelResourceSelectorComponent,
        TableEmptyStateDirective,
    ],
    providers: [
        providePaginationStorageService(GroupUserAssignComponent),
        UserAssignService,
    ],
})
export class GroupUserAssignComponent implements OnInit {
    readonly MEMBERS_OF_GROUP_INIT_SORT_NAME: UserSort = 'fullName';
    readonly MEMBERS_OF_GROUP_INIT_SORT_DIR: SortDir = 'asc';
    /**
     * Edited group-overview to assign to
     */
    group = input.required<Group>();
    /**
     * Pagination id for saving and restoring pagination size
     */
    /**
     * Event emitter of unsaved changes
     */
    hasUnsavedChanges = output<boolean>();
    /**
     * Users available to assign
     */
    readonly users$ = new Subject<User[]>();
    /**
     * Mapping of user model attributes to selector component
     */
    userMapping: SentinelResourceSelectorMapping = {
        id: 'id',
        title: 'name',
        subtitle: 'login',
        icon: 'picture',
    };
    /**
     * Groups available to import (assign its users to edited group-overview)
     */
    readonly groups = signal<Group[]>([]);

    /**
     * Mapping of group-overview model attribute to selector component
     */
    groupMapping: SentinelResourceSelectorMapping = {
        id: 'id',
        title: 'name',
    };
    /**
     * Data for table component of already assigned users
     */
    assignedUsers$: Observable<TableModel<User, UserSort>>;
    /**
     * Text the assigned users are currently filtered by
     */
    filter = '';
    /**
     * True if error was thrown while getting data for assigned users table component, false otherwise
     */
    assignedUsersHasError$: Observable<boolean>;
    /**
     * True if data loading for table component is in progress, false otherwise
     */
    isLoadingAssignedUsers$: Observable<boolean>;
    selectedUsersToAssign$: Observable<User[]> = of();
    selectedGroupsToImport = signal<Group[]>([]);
    assignUsersControls: SentinelControlItem[] = [];
    assignedUsersControls: SentinelControlItem[] = [];
    destroyRef = inject(DestroyRef);
    protected readonly of = of;
    private userAssignService = inject(UserAssignService);
    private paginationService = inject(PaginationStorageService);
    private readonly initialUserPagination =
        this.paginationService.createPagination<UserSort>(
            this.MEMBERS_OF_GROUP_INIT_SORT_NAME,
            this.MEMBERS_OF_GROUP_INIT_SORT_DIR,
        );
    private pagination: OffsetPaginationEvent<UserSort> =
        this.initialUserPagination;

    ngOnInit() {
        this.selectedUsersToAssign$ =
            this.userAssignService.selectedUsersToAssign$.pipe(
                map((users) => users ?? []),
            );
        this.userAssignService.selectedGroupsToImport$
            .pipe(map((groups) => groups ?? []))
            .subscribe((groups) => this.selectedGroupsToImport.set(groups));

        this.initTable();
        this.initAssignUsersControls();
        this.initAssignedUsersControls();
        this.initUnsavedChangesEmitter();
    }

    /**
     * Changes internal state of the component when users to assign are selected
     * @param users selected users to assign
     */
    onUserToAssignSelection(users: User[]): void {
        this.userAssignService.setSelectedUsersToAssign(users);
    }

    /**
     * Changes internal state of the component when assigned users are selected in table component
     * @param users selected assigned users
     */
    onAssignedUsersSelection(users: User[]): void {
        this.userAssignService.setSelectedAssignedUsers(users);
    }

    /**
     * Changes internal state of the component when groups to import are selected
     * @param groups selected groups to import
     */
    onGroupToImportSelection(groups: Group[]): void {
        this.userAssignService.setSelectedGroupsToImport(groups);
    }

    /**
     * Searches for users to assign
     * @param filterValue search value
     */
    searchUsers(filterValue: string): void {
        this.userAssignService
            .getUsersToAssign(this.group().id, filterValue)
            .pipe(map((resource) => resource.elements))
            .subscribe((users) => this.users$.next(users));
    }

    /**
     * Searches for groups to import
     * @param filterValue search value
     */
    searchGroups(filterValue: string): void {
        this.userAssignService
            .getGroupsToImport(filterValue)
            .pipe(map((resource) => resource.elements))
            .subscribe((groups) => this.groups.set(groups));
    }

    /**
     * Calls service to get data for assigned users table
     * @param loadEvent event to load new data emitted by assigned users table component
     */
    onAssignedLoadEvent(loadEvent: TableLoadEvent<UserSort>): void {
        if (loadEvent.pagination) {
            this.pagination = PaginationMapper.toOffsetPaginationEvent(
                loadEvent.pagination,
            );
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.load();
    }

    /**
     * Reloads the assigned users from the first page, filtered by the given text
     * @param filter text to filter users by, empty for no filter
     */
    onFilter(filter: string): void {
        this.filter = filter;
        this.pagination = { ...this.pagination, page: 0 };
        this.load();
    }

    private load(): void {
        this.userAssignService
            .getAssigned(
                this.group().id,
                this.pagination,
                this.filter || undefined,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initUnsavedChangesEmitter() {
        combineLatest([
            this.userAssignService.selectedGroupsToImport$,
            this.userAssignService.selectedUsersToAssign$,
        ])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((selections) =>
                this.hasUnsavedChanges.emit(
                    selections.some(
                        (selection) => selection && selection.length > 0,
                    ),
                ),
            );
    }

    private initAssignedUsersControls() {
        this.userAssignService.selectedAssignedUsers$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((selection) => {
                this.assignedUsersControls = [
                    new DeleteControlItem(
                        selection.length,
                        defer(() =>
                            this.userAssignService.unassignSelected(
                                this.group().id,
                            ),
                        ),
                    ),
                ];
            });
    }

    private initAssignUsersControls() {
        const disabled$ = combineLatest([
            this.userAssignService.selectedUsersToAssign$,
            this.userAssignService.selectedGroupsToImport$,
        ]).pipe(
            map(
                (selections) =>
                    selections[0].length <= 0 && selections[1].length <= 0,
            ),
        );

        this.assignUsersControls = [
            new SaveControlItem(
                'Add',
                disabled$,
                defer(() =>
                    this.userAssignService.assignSelected(this.group().id),
                ),
            ),
        ];
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent<UserSort> = {
            pagination: this.initialUserPagination,
        };
        this.assignedUsers$ = this.userAssignService.assignedUsers$.pipe(
            map(
                (paginatedUsers) =>
                    new GroupMemberTable(
                        paginatedUsers,
                        this.group().id,
                        this.userAssignService,
                    ),
            ),
        );
        this.assignedUsersHasError$ = this.userAssignService.hasError$;
        this.isLoadingAssignedUsers$ =
            this.userAssignService.isLoadingAssigned$;
        this.onAssignedLoadEvent(initialLoadEvent);
    }
}
