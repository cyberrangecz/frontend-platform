import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { OffsetPaginationEvent, SortDir } from '@crczp/utils';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { User } from '@crczp/user-and-group-model';
import { SentinelCellDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import { RouterLink } from '@angular/router';
import { defer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserTable } from '../model/user-table';
import { DeleteControlItem } from '@crczp/user-and-group-agenda/internal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserOverviewService } from '../services/user-overview.service';
import { AsyncPipe } from '@angular/common';
import { FileUploadProgressService, PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { UserSort } from '@crczp/user-and-group-api';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';

/**
 * Main smart component of user overview page
 */
@Component({
    selector: 'crczp-user-overview',
    templateUrl: './user-overview.component.html',
    styleUrls: ['./user-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        SentinelTableComponent,
        SentinelCellDirective,
        SentinelFilterFreeInputComponent,
        SentinelControlsComponent,
        TableEmptyStateDirective,
        RouterLink,
    ],
    providers: [
        FileUploadProgressService,
        providePaginationStorageService(UserOverviewComponent),
        UserOverviewService,
    ],
})
export class UserOverviewComponent implements OnInit {
    readonly INIT_SORT_NAME: UserSort = 'familyName';
    readonly INIT_SORT_DIR: SortDir = 'asc';
    destroyRef = inject(DestroyRef);

    /**
     * Data for users table
     */
    users$: Observable<TableModel<User, string>>;
    /**
     * Text the users are currently filtered by
     */
    filter = '';
    /**
     * True, if data requested for table has error, false otherwise
     */
    usersHasError$: Observable<boolean>;
    /**
     * True while data for users table is being fetched, false otherwise
     */
    isLoading$: Observable<boolean>;
    controls: SentinelControlItem[];
    private userService = inject(UserOverviewService);
    private paginationService = inject(PaginationStorageService);

    private readonly initPagination =
        this.paginationService.createPagination<UserSort>(
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );
    private pagination = this.initPagination;

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent<string> = {
            pagination: this.initPagination,
        };
        this.users$ = this.userService.resource$.pipe(
            map((groups) => new UserTable(groups, this.userService)),
        );
        this.usersHasError$ = this.userService.hasError$;
        this.isLoading$ = this.userService.isLoading$;
        this.onLoadEvent(initialLoadEvent);
        this.userService.selected$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((ids) => this.initControls(ids.length));
    }

    /**
     * Clears selected users and calls service to get new data for table component
     * @param event load table vent emitted by table component
     */
    onLoadEvent(event: TableLoadEvent<string>): void {
        if (event.pagination) {
            this.pagination = event.pagination as OffsetPaginationEvent<UserSort>;
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.load();
    }

    /**
     * Reloads the users from the first page, filtered by the given text
     * @param filter text to filter users by, empty for no filter
     */
    onFilter(filter: string): void {
        this.filter = filter;
        this.pagination = { ...this.pagination, page: 0 };
        this.load();
    }

    /**
     * Changes internal state of the component, stores ids of users selected in table component
     * @param selected users selected in table component
     */
    onUserSelected(selected: User[]): void {
        this.userService.setSelection(selected);
    }

    private load(): void {
        this.userService
            .getAll(this.pagination, this.filter || undefined)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initControls(selectedUsersLength: number) {
        this.controls = [
            new DeleteControlItem(
                selectedUsersLength,
                defer(() => this.userService.deleteSelected()),
            ),
            new SentinelControlItem(
                'download_oidc_users',
                'Get Users Credentials',
                'primary',
                of(false),
                defer(() => this.userService.getLocalOIDCUsers()),
            ),
            new SentinelControlItem(
                'import_users',
                'Import Users',
                'primary',
                of(false),
                defer(() => this.userService.importUsers()),
            ),
        ];
    }
}
