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
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import {Group, UserRole} from '@crczp/user-and-group-model';
import {SentinelTable, SentinelTableComponent, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {
    SentinelResourceSelectorComponent,
    SentinelResourceSelectorMapping
} from '@sentinel/components/resource-selector';
import {async, defer, Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {GroupRolesTable} from '../../model/table/group-roles-table';
import {DeleteControlItem, DefaultPaginationService, SaveControlItem} from '@crczp/user-and-group-agenda/internal';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';
import {AsyncPipe} from '@angular/common';
import {RoleAssignService} from '../../services/state/role-assign.service';

/**
 * Component for role assignment to edited group-overview
 */
@Component({
    selector: 'crczp-group-role-assign',
    templateUrl: './group-role-assign.component.html',
    styleUrls: ['./group-role-assign.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardContent,
        MatCardHeader,
        MatCardSubtitle,
        MatCardTitle,
        MatIcon,
        MatIcon,
        SentinelControlsComponent,
        SentinelResourceSelectorComponent,
        SentinelTableComponent,
        AsyncPipe
    ],
    providers: [{provide: RoleAssignService, useClass: RoleAssignService}]
})
export class GroupRoleAssignComponent implements OnChanges {
    constructor(
        private roleAssignService: RoleAssignService,
        private paginationService: PaginationStorageService
    ) {
        this.roleMapping = {
            id: 'id',
            title: 'roleType',
            subtitle: 'microserviceName'
        };
    }

    readonly ROLES_OF_GROUP_INIT_SORT_NAME = 'roleType';
    readonly ROLES_OF_GROUP_INIT_SORT_DIR = 'asc';
    /**
     * Edited group-overview to assign roles to
     */
    @Input() resource: Group;
    /**
     * Pagination id for saving and restoring pagination size
     */
    @Input() paginationId = 'crczp-group-role-assign';
    /**
     * Event emitter of changes state
     */
    @Output() hasUnsavedChanges: EventEmitter<boolean> = new EventEmitter();
    /**
     * Roles available to assign to edited group-overview
     */
    roles$: Observable<UserRole[]>;
    /**
     * Mapping of role model attributes to selector component
     */
    roleMapping: SentinelResourceSelectorMapping;
    /**
     * True if error was thrown while getting data for table of already assigned roles, false otherwise
     */
    assignedRolesHasError$: Observable<boolean>;
    /**
     * Data for assigned roles table component
     */
    assignedRoles$: Observable<SentinelTable<UserRole>>;
    /**
     * True if getting data for table component is in progress, false otherwise
     */
    isLoadingAssignedRoles$: Observable<boolean>;
    /**
     * Selected roles available to assign to edited group-overview
     */
    selectedRolesToAssign$: Observable<UserRole[]>;
    rolesToAssignControls: SentinelControlItem[];
    assignedRolesControls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    protected readonly async = async;

    ngOnChanges(changes: SimpleChanges): void {
        if ('resource' in changes && this.resource && this.resource.id !== undefined) {
            this.init();
        }
    }

    onControlAction(controlItem: SentinelControlItemSignal): void {
        controlItem.result$.pipe(take(1)).subscribe();
    }

    /**
     * Searches for roles available to assign
     * @param filterValue search value
     */
    search(filterValue: string): void {
        this.roles$ = this.roleAssignService
            .getAvailableToAssign(this.resource.id, filterValue)
            .pipe(map((resource: PaginatedResource<UserRole>) => resource.elements));
    }

    /**
     * Changes internal state of the component when roles to assign are selected
     * @param selected selected roles available to assign to edited group-overview
     */
    onRolesToAssignSelection(selected: UserRole[]): void {
        this.roleAssignService.setSelectedRolesToAssign(selected);
    }

    onAssignedRolesLoad(event: TableLoadEvent): void {
        this.paginationService.savePageSize(event.pagination.size);
        this.roleAssignService
            .getAssigned(this.resource.id, event.pagination as OffsetPaginationEvent, event.filter)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Resolves type of action and calls appropriate handler
     * @param event action emitted from assigned roles table component
     */
    onAssignedRolesTableAction(event: TableActionEvent<UserRole>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    /**
     * Changes internal state of the component when assigned roles are selected
     * @param selected selected assigned roles
     */
    onAssignedRolesSelection(selected: UserRole[]): void {
        this.roleAssignService.setSelectedAssignedRoles(selected);
    }

    private init() {
        this.selectedRolesToAssign$ = this.roleAssignService.selectedRolesToAssign$;
        this.initTable();
        this.initAssignedRolesControls();
        this.initRolesToAssignControls();
        this.initUnsavedChangesEmitter();
    }

    private initTable() {
        this.assignedRoles$ = this.roleAssignService.assignedRoles$.pipe(
            map((resource) => new GroupRolesTable(resource, this.resource.id, this.roleAssignService))
        );
        this.assignedRolesHasError$ = this.roleAssignService.hasError$;
        this.isLoadingAssignedRoles$ = this.roleAssignService.isLoadingAssigned$;
        const initialLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.loadPageSize(),
                this.ROLES_OF_GROUP_INIT_SORT_NAME,
                this.ROLES_OF_GROUP_INIT_SORT_DIR
            )
        };
        this.onAssignedRolesLoad(initialLoadEvent);
    }

    private initAssignedRolesControls() {
        this.roleAssignService.selectedAssignedRoles$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((selection) => {
                this.assignedRolesControls = [
                    new DeleteControlItem(
                        selection.length,
                        defer(() => this.roleAssignService.unassignSelected(this.resource.id))
                    )
                ];
            });
    }

    private initRolesToAssignControls() {
        const disabled$ = this.roleAssignService.selectedRolesToAssign$.pipe(map((selection) => selection.length <= 0));
        this.rolesToAssignControls = [
            new SaveControlItem(
                'Add',
                disabled$,
                defer(() => this.roleAssignService.assignSelected(this.resource.id))
            )
        ];
    }

    private initUnsavedChangesEmitter() {
        this.roleAssignService.selectedRolesToAssign$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((selection) => this.hasUnsavedChanges.emit(selection.length > 0));
    }
}
