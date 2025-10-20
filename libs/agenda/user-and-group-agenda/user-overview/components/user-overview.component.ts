import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { User } from '@crczp/user-and-group-model';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { defer, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserTable } from '../model/user-table';
import { DeleteControlItem } from '@crczp/user-and-group-agenda/internal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserOverviewService } from '../services/user-overview.service';
import { AsyncPipe } from '@angular/common';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { createPaginationEvent } from '@crczp/api-common';
import { UserSort } from '@crczp/user-and-group-api';

/**
 * Main smart component of user overview page
 */
@Component({
    selector: 'crczp-user-overview',
    templateUrl: './user-overview.component.html',
    styleUrls: ['./user-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AsyncPipe, SentinelTableComponent, SentinelControlsComponent],
    providers: [
        providePaginationStorageService(UserOverviewComponent),
        UserOverviewService,
    ],
})
export class UserOverviewComponent implements OnInit {
    readonly INIT_SORT_NAME = 'familyName';
    readonly INIT_SORT_DIR = 'asc';
    destroyRef = inject(DestroyRef);
    /**
     * Data for users table
     */
    users$: Observable<SentinelTable<User, string>>;
    /**
     * True, if data requested for table has error, false otherwise
     */
    usersHasError$: Observable<boolean>;
    controls: SentinelControlItem[];
    private userService = inject(UserOverviewService);
    private paginationService = inject(PaginationStorageService);

    private readonly initPagination = createPaginationEvent<UserSort>({});

    ngOnInit(): void {
        const initialLoadEvent: TableLoadEvent<string> = {
            pagination: this.initPagination,
        };
        this.users$ = this.userService.resource$.pipe(
            map((groups) => new UserTable(groups, this.userService)),
        );
        this.usersHasError$ = this.userService.hasError$;
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
        this.paginationService.savePageSize(event.pagination.size);
        this.userService
            .getAll(
                event.pagination as OffsetPaginationEvent<UserSort>,
                event.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Changes internal state of the component, stores ids of users selected in table component
     * @param selected users selected in table component
     */
    onUserSelected(selected: User[]): void {
        this.userService.setSelection(selected);
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
