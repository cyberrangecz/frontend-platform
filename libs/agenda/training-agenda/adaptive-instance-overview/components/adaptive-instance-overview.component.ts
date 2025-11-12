import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableActionEvent,
    TableLoadEvent
} from '@sentinel/components/table';
import { TrainingInstance } from '@crczp/training-model';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { map, take } from 'rxjs/operators';
import { AdaptiveInstanceOverviewService } from '../services/state/adaptive-instance-overview.service';
import { AdaptiveInstanceOverviewControls } from '../model/adapters/adaptive-instance-overview-controls';
import { AdaptiveInstanceTable } from '../model/adapters/adaptive-instance-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, NgClass } from '@angular/common';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TableCountdownComponent, TableDateCellComponent } from '@crczp/components';
import { NotificationService, PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { TrainingInstanceSort } from '@crczp/training-api';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
    selector: 'crczp-adaptive-instance-overview',
    templateUrl: './adaptive-instance-overview.component.html',
    styleUrls: ['./adaptive-instance-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        SentinelControlsComponent,
        SentinelTableComponent,
        TableCountdownComponent,
        TableDateCellComponent,
        CdkCopyToClipboard,
        MatTooltip,
        MatButton,
        MatIcon,
        NgClass,
        SentinelRowDirective,
        MatProgressSpinner,
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

    onInstanceAction(event: TableActionEvent<any>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    onCopyToken(): void {
        this.notificationService.emit(
            'success',
            'Access token has been copied',
        );
    }

    getAccessTokenTooltip(
        freeSandboxes: string,
        localEnvironment: boolean,
        poolSize: string,
    ) {
        if (!localEnvironment) {
            if (freeSandboxes === '') {
                if (poolSize === '-') {
                    return 'Cannot copy access token, because assigned pool does not exist.';
                }
                return 'Cannot copy access token, because there is no pool assigned.';
            } else if (freeSandboxes === '0') {
                return 'Cannot copy access token because there is no free sandbox.';
            }
        }
        return 'Click to copy access token';
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
