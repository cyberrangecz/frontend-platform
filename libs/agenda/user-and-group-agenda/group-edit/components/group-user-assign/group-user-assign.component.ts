import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges
} from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { Group, User } from '@crczp/user-and-group-model';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import {
    SentinelResourceSelectorComponent,
    SentinelResourceSelectorMapping
} from '@sentinel/components/resource-selector';
import { combineLatest, defer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GroupMemberTable } from '../../model/table/group-member-table';
import { DeleteControlItem, SaveControlItem } from '@crczp/user-and-group-agenda/internal';
import { UserAssignService } from '../../services/state/user-assign.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { UserSort } from '@crczp/user-and-group-api';

/**
 * Component for user assignment to groups
 */
@Component({
    selector: 'crczp-group-user-assign',
    templateUrl: './group-user-assign.component.html',
    styleUrls: ['./group-user-assign.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        MatCard,
        MatCardContent,
        MatCardHeader,
        MatIcon,
        SentinelControlsComponent,
        SentinelResourceSelectorComponent,
        SentinelTableComponent,
        MatCardTitle,
        MatCardSubtitle,
    ],
    providers: [
        providePaginationStorageService(GroupUserAssignComponent),
        UserAssignService,
    ],
})
export class GroupUserAssignComponent implements OnChanges {
    readonly MEMBERS_OF_GROUP_INIT_SORT_NAME = 'familyName';
    readonly MEMBERS_OF_GROUP_INIT_SORT_DIR = 'asc';
    /**
     * Edited group-overview to assign to
     */
    @Input() resource: Group;
    /**
     * Pagination id for saving and restoring pagination size
     */
    /**
     * Event emitter of unsaved changes
     */
    @Output() hasUnsavedChanges: EventEmitter<boolean> = new EventEmitter();
    /**
     * Users available to assign
     */
    users$: Observable<User[]> = of();
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
    groups$: Observable<Group[]> = of();
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
    assignedUsers$: Observable<SentinelTable<User, string>>;
    /**
     * True if error was thrown while getting data for assigned users table component, false otherwise
     */
    assignedUsersHasError$: Observable<boolean>;
    /**
     * True if data loading for table component is in progress, false otherwise
     */
    isLoadingAssignedUsers$: Observable<boolean>;
    selectedUsersToAssign$: Observable<User[]> = of();
    selectedGroupsToImport$: Observable<Group[]> = of();
    assignUsersControls: SentinelControlItem[] = [];
    assignedUsersControls: SentinelControlItem[] = [];
    destroyRef = inject(DestroyRef);
    private readonly initialUserPagination = createPaginationEvent<UserSort>({
        sort: 'fullName',
        sortDir: 'asc',
    });
    private userAssignService = inject(UserAssignService);
    private paginationService = inject(PaginationStorageService);

    ngOnChanges(changes: SimpleChanges): void {
        if (
            'resource' in changes &&
            this.resource &&
            this.resource.id !== undefined
        ) {
            this.init();
        }
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
        this.users$ = this.userAssignService
            .getUsersToAssign(this.resource.id, filterValue)
            .pipe(map((resource) => resource.elements));
    }

    /**
     * Searches for groups to import
     * @param filterValue search value
     */
    searchGroups(filterValue: string): void {
        this.groups$ = this.userAssignService
            .getGroupsToImport(filterValue)
            .pipe(map((resource) => resource.elements));
    }

    /**
     * Calls service to get data for assigned users table
     * @param loadEvent event to load new data emitted by assigned users table component
     */
    onAssignedLoadEvent(loadEvent: TableLoadEvent<UserSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.userAssignService
            .getAssigned(
                this.resource.id,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private init() {
        this.selectedUsersToAssign$ =
            this.userAssignService.selectedUsersToAssign$.pipe(
                map((users) => users ?? []),
            );
        this.selectedGroupsToImport$ =
            this.userAssignService.selectedGroupsToImport$.pipe(
                map((groups) => groups ?? []),
            );
        this.initTable();
        this.initAssignUsersControls();
        this.initAssignedUsersControls();
        this.initUnsavedChangesEmitter();
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
                                this.resource.id,
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
                    this.userAssignService.assignSelected(this.resource.id),
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
                        this.resource.id,
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
