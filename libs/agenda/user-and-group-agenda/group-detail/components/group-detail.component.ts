import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Group, User, UserRole } from '@crczp/user-and-group-model';
import { Observable } from 'rxjs';
import {
    SentinelCellDirective,
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MembersDetailService } from '../services/members-detail.service';
import { RolesDetailService } from '../services/roles-detail.service';
import { CommonModule } from '@angular/common';
import { instantiatePaginationStorageService } from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { RoleSort, UserSort } from '@crczp/user-and-group-api';
import { OffsetPaginationEvent, SortDir } from '@crczp/utils';
import { map } from 'rxjs/operators';
import { MembersDetailTable } from '../model/members-detail-table';
import { RolesDetailTable } from '../model/roles-detail-table';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';

@Component({
    selector: 'crczp-group-detail',
    templateUrl: './group-detail.component.html',
    styleUrls: ['./group-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        SentinelTableComponent,
        SentinelCellDirective,
        MatCardModule,
        MatIconModule,
        MatTooltipModule,
        SentinelFilterFreeInputComponent,
        TableEmptyStateDirective,
    ],
    providers: [MembersDetailService, RolesDetailService],
})
export class GroupDetailComponent implements OnInit {
    readonly INIT_MEMBERS_SORT_NAME: UserSort = 'familyName,givenName';
    readonly INIT_ROLES_SORT_NAME: RoleSort = 'roleType';
    readonly INIT_SORT_DIR: SortDir = 'asc';
    group: Group;
    roles$: Observable<TableModel<UserRole, RoleSort>>;
    /**
     * Text the roles are currently filtered by
     */
    rolesFilter = '';
    rolesTableHasError$: Observable<boolean>;
    isLoadingRoles$: Observable<boolean>;
    members$: Observable<TableModel<User, UserSort>>;
    /**
     * Text the members are currently filtered by
     */
    membersFilter = '';
    membersTableHasError$: Observable<boolean>;
    isLoadingMembers$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private membersDetailService = inject(MembersDetailService);
    private rolesDetailService = inject(RolesDetailService);
    private membersPaginationService = instantiatePaginationStorageService(
        GroupDetailComponent.name + '_members',
    );

    private rolesPaginationService = instantiatePaginationStorageService(
        GroupDetailComponent.name + '_roles',
    );

    private readonly initialRolePagination =
        this.rolesPaginationService.createPagination<RoleSort>(
            this.INIT_ROLES_SORT_NAME,
            this.INIT_SORT_DIR,
        );
    private initialUserPagination =
        this.membersPaginationService.createPagination<UserSort>(
            this.INIT_MEMBERS_SORT_NAME,
            this.INIT_SORT_DIR,
        );
    private rolesPagination: OffsetPaginationEvent<RoleSort> =
        this.initialRolePagination;
    private membersPagination: OffsetPaginationEvent<UserSort> =
        this.initialUserPagination;

    ngOnInit(): void {
        this.initTables();
    }

    /**
     * Gets new data for group detail roles table
     * @param loadEvent load event emitted from roles detail table
     */
    onRolesLoadEvent(loadEvent: TableLoadEvent<RoleSort>): void {
        if (loadEvent.pagination) {
            this.rolesPagination = PaginationMapper.toOffsetPaginationEvent(
                loadEvent.pagination,
            );
        }
        this.rolesPaginationService.savePageSize(this.rolesPagination.size);
        this.loadRoles();
    }

    /**
     * Reloads the roles from the first page, filtered by the given text
     * @param filter text to filter roles by, empty for no filter
     */
    onRolesFilter(filter: string): void {
        this.rolesFilter = filter;
        this.rolesPagination = { ...this.rolesPagination, page: 0 };
        this.loadRoles();
    }

    /**
     * Gets new data for group detail members table
     * @param loadEvent load event emitted from mmebers detail table
     */
    onMembersLoadEvent(loadEvent: TableLoadEvent<UserSort>): void {
        if (loadEvent.pagination) {
            this.membersPagination = PaginationMapper.toOffsetPaginationEvent(
                loadEvent.pagination,
            );
        }
        this.membersPaginationService.savePageSize(this.membersPagination.size);
        this.loadMembers();
    }

    /**
     * Reloads the members from the first page, filtered by the given text
     * @param filter text to filter members by, empty for no filter
     */
    onMembersFilter(filter: string): void {
        this.membersFilter = filter;
        this.membersPagination = { ...this.membersPagination, page: 0 };
        this.loadMembers();
    }

    private loadRoles(): void {
        this.rolesDetailService
            .getAssigned(
                this.group.id,
                this.rolesPagination,
                this.rolesFilter || undefined,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private loadMembers(): void {
        this.membersDetailService
            .getAssigned(
                this.group.id,
                this.membersPagination,
                this.membersFilter || undefined,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTables(): void {
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                this.group = data[Group.name];
                this.initMembersTable();
                this.initRolesTable();
            });
    }

    private initMembersTable() {
        const initialLoadEvent: TableLoadEvent<UserSort> = {
            pagination: this.initialUserPagination,
        };
        this.members$ = this.membersDetailService.assignedUsers$.pipe(
            map((resource) => new MembersDetailTable(resource)),
        );
        this.membersTableHasError$ = this.membersDetailService.hasError$;
        this.isLoadingMembers$ = this.membersDetailService.isLoadingAssigned$;
        this.onMembersLoadEvent(initialLoadEvent);
    }

    private initRolesTable() {
        const initialLoadEvent: TableLoadEvent<RoleSort> = {
            pagination: this.initialRolePagination,
        };
        this.roles$ = this.rolesDetailService.assignedRoles$.pipe(
            map((resource) => new RolesDetailTable(resource)),
        );
        this.rolesTableHasError$ = this.rolesDetailService.hasError$;
        this.isLoadingRoles$ = this.rolesDetailService.isLoadingAssigned$;
        this.onRolesLoadEvent(initialLoadEvent);
    }
}
