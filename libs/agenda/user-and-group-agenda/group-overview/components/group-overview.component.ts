import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { Group } from '@crczp/user-and-group-model';
import { SentinelCellDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import { RouterLink } from '@angular/router';
import { defer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GroupTable } from '../model/table/group-table';
import { DeleteControlItem, SaveControlItem } from '@crczp/user-and-group-agenda/internal';
import { GroupOverviewService } from '../services/group-overview.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { OffsetPaginationEvent, PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { GroupSort } from '@crczp/user-and-group-api';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';

/**
 * Main smart component of group-overview overview page
 */
@Component({
    selector: 'crczp-group-overview',
    templateUrl: './group-overview.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        providePaginationStorageService(GroupOverviewComponent),
        {
            provide: GroupOverviewService,
            useClass: GroupOverviewService,
        },
    ],
    imports: [
        SentinelTableComponent,
        SentinelCellDirective,
        SentinelFilterFreeInputComponent,
        SentinelControlsComponent,
        AsyncPipe,
        TableEmptyStateDirective,
        RouterLink,
    ],
})
export class GroupOverviewComponent implements OnInit {
    readonly INIT_SORT_NAME = 'name';
    readonly INIT_SORT_DIR = 'asc';
    /**
     * Data for groups table component
     */
    groups$: Observable<TableModel<Group, string>>;
    /**
     * Text the groups are currently filtered by
     */
    filter = '';
    /**
     * True if error was thrown while getting data for groups table, false otherwise
     */
    groupsHasError$: Observable<boolean>;
    /**
     * True while data for groups table is being fetched, false otherwise
     */
    isLoading$: Observable<boolean>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private groupService = inject(GroupOverviewService);
    private paginationService = inject(PaginationStorageService);
    private readonly initPagination =
        this.paginationService.createPagination<GroupSort>(
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );
    private pagination: OffsetPaginationEvent<GroupSort> = this.initPagination;

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent<GroupSort> = {
            pagination: this.initPagination,
        };
        this.groups$ = this.groupService.resource$.pipe(
            map((groups) => new GroupTable(groups, this.groupService)),
        );
        this.groupsHasError$ = this.groupService.hasError$;
        this.isLoading$ = this.groupService.isLoading$;
        this.groupService.selected$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((ids) => this.initControls(ids.length));
        this.onTableLoadEvent(initialLoadEvent);
    }

    /**
     * Clears selected groups and calls service to get new data for groups table
     * @param event event emitted from table component
     */
    onTableLoadEvent(event: TableLoadEvent<GroupSort>): void {
        if (event.pagination) {
            this.pagination = PaginationMapper.toOffsetPaginationEvent(
                event.pagination,
            );
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.load();
    }

    /**
     * Reloads the groups from the first page, filtered by the given text
     * @param filter text to filter groups by, empty for no filter
     */
    onFilter(filter: string): void {
        this.filter = filter;
        this.pagination = { ...this.pagination, page: 0 };
        this.load();
    }

    /**
     * Changes internal state of the component when selection is changed in table component
     * @param selected groups selected in table component
     */
    onGroupSelected(selected: Group[]): void {
        this.groupService.setSelection(selected);
    }

    private load(): void {
        this.groupService
            .getAll(this.pagination, this.filter || undefined)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initControls(selectedLength: number) {
        this.controls = [
            new DeleteControlItem(
                selectedLength,
                defer(() => this.groupService.deleteSelected()),
            ),
            new SaveControlItem(
                'Create',
                of(false),
                defer(() => this.groupService.create()),
            ),
        ];
    }
}
