import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit,} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Group, User, UserRole} from '@crczp/user-and-group-model';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {MembersDetailTable} from '../model/members-detail-table';
import {RolesDetailTable} from '../model/roles-detail-table';
import {SentinelRowDirective, SentinelTable, SentinelTableComponent, TableLoadEvent,} from '@sentinel/components/table';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MembersDetailService} from '../services/members-detail.service';
import {RolesDetailService} from '../services/roles-detail.service';
import {CommonModule} from '@angular/common';
import {PaginationStorageService, providePaginationStorageService,} from '@crczp/common';
import {GROUP_DATA_ATTRIBUTE_NAME} from '@crczp/user-and-group-agenda';

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
    @Input() paginationId = 'crczp-group-detail';
    @Input() defaultPaginationSize = 10;
    readonly INIT_MEMBERS_SORT_NAME = 'familyName';
    readonly INIT_ROLES_SORT_NAME = 'roleType';
    readonly INIT_SORT_DIR = 'asc';
    group: Group;
    roles$: Observable<SentinelTable<UserRole>>;
    rolesTableHasError$: Observable<boolean>;
    isLoadingRoles$: Observable<boolean>;
    members$: Observable<SentinelTable<User>>;
    membersTableHasError$: Observable<boolean>;
    isLoadingMembers$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private membersDetailService = inject(MembersDetailService);
    private rolesDetailService = inject(RolesDetailService);
    private paginationService = inject(PaginationStorageService);

    ngOnInit(): void {
        this.initTables();
    }

    /**
     * Gets new data for group detail roles table
     * @param loadEvent load event emitted from roles detail table
     */
    onRolesLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.rolesDetailService
            .getAssigned(
                this.group.id,
                loadEvent.pagination as OffsetPaginationEvent,
                loadEvent.filter
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Gets new data for group detail members table
     * @param loadEvent load event emitted from mmebers detail table
     */
    onMembersLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.membersDetailService
            .getAssigned(
                this.group.id,
                loadEvent.pagination as OffsetPaginationEvent,
                loadEvent.filter
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTables(): void {
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                this.group = data[GROUP_DATA_ATTRIBUTE_NAME];
                this.initMembersTable();
                this.initRolesTable();
            });
    }

    private initMembersTable() {
        const initialLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.loadPageSize(),
                this.INIT_MEMBERS_SORT_NAME,
                this.INIT_SORT_DIR
            ),
        };
        this.members$ = this.membersDetailService.assignedUsers$.pipe(
            map((resource) => new MembersDetailTable(resource))
        );
        this.membersTableHasError$ = this.membersDetailService.hasError$;
        this.isLoadingMembers$ = this.membersDetailService.isLoadingAssigned$;
        this.onMembersLoadEvent(initialLoadEvent);
    }

    private initRolesTable() {
        const initialLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.loadPageSize(),
                this.INIT_ROLES_SORT_NAME,
                this.INIT_SORT_DIR
            ),
        };
        this.roles$ = this.rolesDetailService.assignedRoles$.pipe(
            map((resource) => new RolesDetailTable(resource))
        );
        this.rolesTableHasError$ = this.rolesDetailService.hasError$;
        this.isLoadingRoles$ = this.rolesDetailService.isLoadingAssigned$;
        this.onRolesLoadEvent(initialLoadEvent);
    }
}
