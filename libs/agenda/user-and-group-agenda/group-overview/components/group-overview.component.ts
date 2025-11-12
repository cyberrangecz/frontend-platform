import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { Group } from '@crczp/user-and-group-model';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { defer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GroupTable } from '../model/table/group-table';
import { DeleteControlItem, SaveControlItem } from '@crczp/user-and-group-agenda/internal';
import { GroupOverviewService } from '../services/group-overview.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { GroupSort } from '@crczp/user-and-group-api';

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
    imports: [SentinelTableComponent, SentinelControlsComponent, AsyncPipe],
})
export class GroupOverviewComponent implements OnInit {
    readonly INIT_SORT_NAME = 'name';
    readonly INIT_SORT_DIR = 'asc';
    /**
     * Data for groups table component
     */
    groups$: Observable<SentinelTable<Group, string>>;
    /**
     * True if error was thrown while getting data for groups table, false otherwise
     */
    groupsHasError$: Observable<boolean>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private groupService = inject(GroupOverviewService);
    private paginationService = inject(PaginationStorageService);
    private readonly initPagination =
        this.paginationService.createPagination<GroupSort>(
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent<GroupSort> = {
            pagination: this.initPagination,
        };
        this.groups$ = this.groupService.resource$.pipe(
            map((groups) => new GroupTable(groups, this.groupService)),
        );
        this.groupsHasError$ = this.groupService.hasError$;
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
        this.paginationService.savePageSize(event.pagination.size);
        this.groupService
            .getAll(
                PaginationMapper.toOffsetPaginationEvent(event.pagination),
                event.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
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
