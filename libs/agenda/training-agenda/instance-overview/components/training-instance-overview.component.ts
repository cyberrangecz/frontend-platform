import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { TrainingInstance } from '@crczp/training-model';
import { SentinelCellDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainingInstanceOverviewControls } from '../model/adapters/training-instance-overview-controls';
import { TrainingInstanceTable } from '../model/adapters/training-instance-table';
import { PoolSize, TrainingInstanceOverviewService } from '../services/state/training-instance-overview.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import {
    TableCountdownComponent,
    TableDateCellComponent,
    TableEmptyStateDirective,
    TableModel
} from '@crczp/components';
import {
    NotificationService,
    PaginationStorageService,
    providePaginationStorageService,
    RoleService,
    SortDir,
} from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { TrainingInstanceSort } from '@crczp/training-api';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

/**
 * Main component of organizer overview.
 */
@Component({
    selector: 'crczp-training-instance-overview',
    templateUrl: './training-instance-overview.component.html',
    styleUrls: ['./training-instance-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelControlsComponent,
        SentinelTableComponent,
        AsyncPipe,
        SentinelCellDirective,
        SentinelFilterFreeInputComponent,
        RouterLink,
        TableDateCellComponent,
        MatTooltip,
        MatButton,
        MatIcon,
        CdkCopyToClipboard,
        MatProgressSpinner,
        TableCountdownComponent,
        TableEmptyStateDirective,
    ],
    providers: [
        providePaginationStorageService(TrainingInstanceOverviewComponent),
        {
            provide: TrainingInstanceOverviewService,
            useClass: TrainingInstanceOverviewService,
        },
    ],
})
export class TrainingInstanceOverviewComponent {
    readonly INITIAL_SORT_NAME: TrainingInstanceSort = 'startTime';
    readonly INITIAL_SORT_DIR: SortDir = 'desc';
    readonly PAGE_SIZE_OPTIONS = [10, 25, 50];
    instances$: Observable<TableModel<TrainingInstance, TrainingInstanceSort>>;
    /**
     * Text the training instances are currently filtered by
     */
    filter = '';
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    controls: SentinelControlItem[];
    private service = inject(TrainingInstanceOverviewService);
    private paginationService = inject(PaginationStorageService);
    private notificationService = inject(NotificationService);
    private roleService = inject(RoleService);
    private readonly initialInstancePagination =
        this.paginationService.createPagination<TrainingInstanceSort>(
            this.INITIAL_SORT_NAME,
            this.INITIAL_SORT_DIR,
        );
    private pagination = this.initialInstancePagination;

    constructor() {
        this.controls = TrainingInstanceOverviewControls.create(this.service);
        this.initTable();
    }

    onInstancesLoadEvent(
        loadEvent: TableLoadEvent<TrainingInstanceSort>,
    ): void {
        if (loadEvent.pagination) {
            this.pagination = PaginationMapper.toOffsetPaginationEvent(
                loadEvent.pagination,
            );
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.load();
    }

    /**
     * Reloads the training instances from the first page, filtered by the given text
     * @param filter text to filter training instances by, empty for no filter
     */
    onFilter(filter: string): void {
        this.filter = filter;
        this.pagination = { ...this.pagination, page: 0 };
        this.load();
    }

    onCopyToken(): void {
        this.notificationService.emit(
            'success',
            'Access token has been copied',
        );
    }

    getAccessTokenTooltip(poolSize: PoolSize, localEnvironment: boolean) {
        if (!localEnvironment) {
            if ('error' in poolSize) {
                if (poolSize.error === 'REMOVED') {
                    return 'Cannot copy access token because the associated pool has been removed.';
                }
                if (poolSize.error === 'NOT_ASSIGNED') {
                    return 'Cannot copy access token because there is no associated pool.';
                }
            } else if (poolSize.total - poolSize.used === 0) {
                return 'Cannot copy access token because there is no free sandbox.';
            }
        }
        return 'Click to copy access token';
    }

    protected castToPoolSize(poolSize: unknown): PoolSize {
        if (!poolSize) {
            return undefined;
        }
        return poolSize as PoolSize;
    }

    protected tokenCopyDisabled(
        poolSize: PoolSize,
        localEnvironment: boolean,
    ): boolean {
        return (
            !localEnvironment &&
            ('error' in poolSize || poolSize.total - poolSize.used === 0)
        );
    }

    protected getFreePoolSize(poolSize: PoolSize) {
        if ('error' in poolSize) {
            return 0;
        }
        return poolSize.total - poolSize.used;
    }

    private load(): void {
        this.service
            .getAll(this.pagination, this.filter || undefined)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        const initLoadEvent: TableLoadEvent<TrainingInstanceSort> = {
            pagination: this.initialInstancePagination,
        };
        this.instances$ = this.service.resource$.pipe(
            map(
                (instances) =>
                    new TrainingInstanceTable(
                        instances,
                        this.service,
                        this.roleService.hasRole('trainingDesigner'),
                    ),
            ),
        );
        this.hasError$ = this.service.hasError$;
        this.isLoading$ = this.service.isLoading$;
        this.onInstancesLoadEvent(initLoadEvent);
    }
}
