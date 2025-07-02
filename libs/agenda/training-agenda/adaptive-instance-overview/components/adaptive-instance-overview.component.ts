import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {SentinelTable, SentinelTableComponent, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {TrainingInstance} from '@crczp/training-model';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {map, take} from 'rxjs/operators';
import {AdaptiveInstanceOverviewService} from '../services/state/adaptive-instance-overview.service';
import {TrainingNavigator, TrainingNotificationService} from '@crczp/training-agenda';
import {AdaptiveInstanceOverviewControls} from '../model/adapters/adaptive-instance-overview-controls';
import {AdaptiveInstanceTable} from '../model/adapters/adaptive-instance-table';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
    LogoSpinnerComponent,
    PaginationStorageService,
    TableCountdownComponent,
    TableDateCellComponent
} from "@crczp/common";
import {AsyncPipe, NgIf} from "@angular/common";
import {CdkCopyToClipboard} from "@angular/cdk/clipboard";
import {MatTooltip} from "@angular/material/tooltip";
import {MatButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatProgressSpinner} from "@angular/material/progress-spinner";

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
        MatProgressSpinner,
        LogoSpinnerComponent,
        NgIf
    ]
})
export class AdaptiveInstanceOverviewComponent implements OnInit {
    private service = inject(AdaptiveInstanceOverviewService);
    private paginationService = inject(PaginationStorageService);
    private navigator = inject(TrainingNavigator);
    private notificationService = inject(TrainingNotificationService);

    @Input() paginationId = 'adaptive-instance-overview';
    readonly INITIAL_SORT_NAME = 'startTime';
    readonly INITIAL_SORT_DIR = 'desc';

    instances$: Observable<SentinelTable<TrainingInstance>>;
    hasError$: Observable<boolean>;

    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.controls = AdaptiveInstanceOverviewControls.create(this.service);
        this.initTable();
    }

    onControlAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    onInstancesLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.service
            .getAll(
                new OffsetPaginationEvent(
                    0,
                    loadEvent.pagination.size,
                    loadEvent.pagination.sort,
                    loadEvent.pagination.sortDir,
                ),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    onInstanceAction(event: TableActionEvent<any>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    onCopyToken(): void {
        this.notificationService.emit('success', 'Access token has been copied');
    }

    getAccessTokenTooltip(freeSandboxes: string, localEnvironment: boolean, poolSize: string) {
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
        const initLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.loadPageSize(),
                this.INITIAL_SORT_NAME,
                this.INITIAL_SORT_DIR,
            ),
        };
        this.instances$ = this.service.resource$.pipe(
            map((instances) => new AdaptiveInstanceTable(instances, this.service, this.navigator)),
        );
        this.hasError$ = this.service.hasError$;
        this.onInstancesLoadEvent(initLoadEvent);
    }
}
