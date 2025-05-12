import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import { Group } from '@crczp/user-and-group-model';
import { SentinelTable, SentinelTableComponent, TableActionEvent, TableLoadEvent } from '@sentinel/components/table';
import { async, defer, Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { GroupTable } from '../model/table/group-table';
import { DeleteControlItem, DefaultPaginationService, SaveControlItem } from '../../../internal/src';
import { GroupOverviewService } from '../services/group-overview.service';
import { UserAndGroupDefaultNavigator, UserAndGroupNavigator } from '../../../public';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupResolver } from '../services/resolvers/group-resolver.service';
import { GroupTitleResolver } from '../services/resolvers/group-title-resolver.service';
import { GroupBreadcrumbResolver } from '../services/resolvers/group-breadcrumb-resolver.service';
import { GroupOverviewConcreteService } from '../services/group-overview.concrete.service';
import { AsyncPipe } from '@angular/common';

/**
 * Main smart component of group-overview overview page
 */
@Component({
    selector: 'crczp-group-overview',
    templateUrl: './group-overview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        DefaultPaginationService,
        GroupResolver,
        GroupTitleResolver,
        GroupBreadcrumbResolver,
        { provide: GroupOverviewService, useClass: GroupOverviewConcreteService },
        { provide: UserAndGroupNavigator, useClass: UserAndGroupDefaultNavigator }
    ],
    imports: [
        SentinelTableComponent,
        SentinelControlsComponent,
        AsyncPipe
    ]
})
export class GroupOverviewComponent implements OnInit {
    constructor(
        private groupService: GroupOverviewService,
        private paginationService: DefaultPaginationService,
        private navigator: UserAndGroupNavigator
    ) {
    }

    @Input() paginationId = 'crczp-group-overview';
    readonly INIT_SORT_NAME = 'name';
    readonly INIT_SORT_DIR = 'asc';
    /**
     * Data for groups table component
     */
    groups$: Observable<SentinelTable<Group>>;
    /**
     * True if error was thrown while getting data for groups table, false otherwise
     */
    groupsHasError$: Observable<boolean>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    protected readonly async = async;

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.getPagination(this.paginationId),
                this.INIT_SORT_NAME,
                this.INIT_SORT_DIR
            )
        };
        this.groups$ = this.groupService.resource$.pipe(
            map((groups) => new GroupTable(groups, this.groupService, this.navigator))
        );
        this.groupsHasError$ = this.groupService.hasError$;
        this.groupService.selected$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((ids) => this.initControls(ids.length));
        this.onTableLoadEvent(initialLoadEvent);
    }

    onControlsAction(controlItem: SentinelControlItemSignal): void {
        controlItem.result$.pipe(take(1)).subscribe();
    }

    /**
     * Clears selected groups and calls service to get new data for groups table
     * @param event event emitted from table component
     */
    onTableLoadEvent(event: TableLoadEvent): void {
        this.paginationService.setPagination(this.paginationId, event.pagination.size);
        this.groupService.getAll(event.pagination, event.filter).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Resolves type of action call appropriate handler
     * @param event action event emitted by table component
     */
    onTableAction(event: TableActionEvent<Group>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    /**
     * Changes internal state of the component when selection is changed in table component
     * @param selected groups selected in table component
     */
    onGroupSelected(selected: Group[]): void {
        this.groupService.setSelection(selected);
    }

    private initControls(selectedLength: number) {
        this.controls = [
            new DeleteControlItem(
                selectedLength,
                defer(() => this.groupService.deleteSelected())
            ),
            new SaveControlItem(
                'Create',
                of(false),
                defer(() => this.groupService.create())
            )
        ];
    }
}
