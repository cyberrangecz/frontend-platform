import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
} from '@angular/core';
import { Observable } from 'rxjs';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { TrainingInstance } from '@crczp/training-model';
import {
    SentinelControlItem,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import { map } from 'rxjs/operators';
import { AdaptiveInstanceOverviewService } from '../services/state/adaptive-instance-overview.service';
import { AdaptiveInstanceOverviewControls } from '../model/adapters/adaptive-instance-overview-controls';
import { AdaptiveInstanceTable } from '../model/adapters/adaptive-instance-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TableDateCellComponent } from '@crczp/components';
import {
    NotificationService,
    PaginationStorageService,
    providePaginationStorageService,
} from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { TrainingInstanceSort } from '@crczp/training-api';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PoolSize } from '@crczp/training-agenda/instance-overview';
import { InstanceCountdownComponent } from '../../instance-overview/components/instance-countdown/instance-countdown.component';

@Component({
    selector: 'crczp-adaptive-instance-overview',
    templateUrl:
        '../../instance-overview/components/training-instance-overview.component.html',
    styleUrls: ['./adaptive-instance-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        SentinelControlsComponent,
        SentinelTableComponent,
        TableDateCellComponent,
        CdkCopyToClipboard,
        MatTooltip,
        MatButton,
        MatIcon,
        SentinelRowDirective,
        MatProgressSpinner,
        InstanceCountdownComponent,
    ],
    providers: [
        providePaginationStorageService(AdaptiveInstanceOverviewComponent),
        {
            provide: AdaptiveInstanceOverviewService,
            useClass: AdaptiveInstanceOverviewService,
        },
    ],
})
export class AdaptiveInstanceOverviewComponent implements OnInit {
    readonly INITIAL_SORT_NAME = 'startTime';
    readonly INITIAL_SORT_DIR = 'desc';
    instances$: Observable<SentinelTable<TrainingInstance, string>>;
    hasError$: Observable<boolean>;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private service = inject(AdaptiveInstanceOverviewService);
    private paginationService = inject(PaginationStorageService);
    private notificationService = inject(NotificationService);

    private readonly initialPagination =
        this.paginationService.createPagination<TrainingInstanceSort>(
            this.INITIAL_SORT_NAME,
            this.INITIAL_SORT_DIR,
        );

    ngOnInit(): void {
        this.controls = AdaptiveInstanceOverviewControls.create(this.service);
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
        this.instances$ = this.service.resource$.pipe(
            map(
                (instances) =>
                    new AdaptiveInstanceTable(instances, this.service),
            ),
        );
        this.hasError$ = this.service.hasError$;
        this.onInstancesLoadEvent({ pagination: this.initialPagination });
    }
}
