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
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MembersDetailService } from '../services/members-detail.service';
import { RolesDetailService } from '../services/roles-detail.service';
import { CommonModule } from '@angular/common';
import {
    PaginationStorageService,
    providePaginationStorageService,
} from '@crczp/utils';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { RoleSort, UserSort } from '@crczp/user-and-group-api';
import { SortDir } from '@sentinel/common/pagination';
import { map } from 'rxjs/operators';
import { MembersDetailTable } from '../model/members-detail-table';
import { RolesDetailTable } from '../model/roles-detail-table';

@Component({
    selector: 'crczp-group-detail',
    templateUrl: './group-detail.component.html',
    styleUrls: ['./group-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        SentinelTableComponent,
        MatCardModule,
        MatIconModule,
        MatTooltipModule,
        SentinelRowDirective,
    ],
    providers: [
        providePaginationStorageService(GroupDetailComponent),
        MembersDetailService,
        RolesDetailService,
    ],
})
export class GroupDetailComponent implements OnInit {
    readonly INIT_MEMBERS_SORT_NAME: UserSort = 'fullName';
    readonly INIT_ROLES_SORT_NAME: RoleSort = 'roleType';
    readonly INIT_SORT_DIR: SortDir = 'asc';
    group: Group;
    roles$: Observable<SentinelTable<UserRole, string>>;
    rolesTableHasError$: Observable<boolean>;
    isLoadingRoles$: Observable<boolean>;
    members$: Observable<SentinelTable<User, string>>;
    membersTableHasError$: Observable<boolean>;
    isLoadingMembers$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private membersDetailService = inject(MembersDetailService);
    private rolesDetailService = inject(RolesDetailService);
    private paginationService = inject(PaginationStorageService);

    private readonly initialRolePagination = createPaginationEvent<RoleSort>({
        sort: 'roleType',
        sortDir: 'asc',
    });
    private initialUserPagination = createPaginationEvent<UserSort>({
        sort: 'fullName',
        sortDir: this.INIT_SORT_DIR,
    });

    ngOnInit(): void {
        this.initTables();
    }

    /**
     * Gets new data for group detail roles table
     * @param loadEvent load event emitted from roles detail table
     */
    onRolesLoadEvent(loadEvent: TableLoadEvent<RoleSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.rolesDetailService
            .getAssigned(
                this.group.id,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Gets new data for group detail members table
     * @param loadEvent load event emitted from mmebers detail table
     */
    onMembersLoadEvent(loadEvent: TableLoadEvent<UserSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.membersDetailService
            .getAssigned(
                this.group.id,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
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
