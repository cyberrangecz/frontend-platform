import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { TrainingInstance } from '@crczp/training-model';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent
} from '@sentinel/components/table';
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
import { TableCountdownComponent, TableDateCellComponent } from '@crczp/components';
import { NotificationService, PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
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
        SentinelRowDirective,
        TableDateCellComponent,
        MatTooltip,
        MatButton,
        MatIcon,
        CdkCopyToClipboard,
        MatProgressSpinner,
        TableCountdownComponent,
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
    readonly INITIAL_SORT_NAME = 'startTime';
    readonly INITIAL_SORT_DIR = 'desc';
    instances$: Observable<SentinelTable<TrainingInstance, string>>;
    hasError$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    controls: SentinelControlItem[];
    private service = inject(TrainingInstanceOverviewService);
    private paginationService = inject(PaginationStorageService);
    private notificationService = inject(NotificationService);
    private readonly initialInstancePagination =
        this.paginationService.createPagination<TrainingInstanceSort>(
            this.INITIAL_SORT_NAME,
            this.INITIAL_SORT_DIR,
        );

    constructor() {
        this.controls = TrainingInstanceOverviewControls.create(this.service);
        this.initTable();
    }

    onInstancesLoadEvent(
        loadEvent: TableLoadEvent<TrainingInstanceSort>,
    ): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.service
            .getAll(
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
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

    private initTable() {
        const initLoadEvent: TableLoadEvent<TrainingInstanceSort> = {
            pagination: this.initialInstancePagination,
        };
        this.instances$ = this.service.resource$.pipe(
            map(
                (instances) =>
                    new TrainingInstanceTable(instances, this.service),
            ),
        );
        this.hasError$ = this.service.hasError$;
        this.onInstancesLoadEvent(initLoadEvent);
    }
}
