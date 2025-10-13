import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import { TrainingInstance } from '@crczp/training-model';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableActionEvent,
    TableLoadEvent
} from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { TrainingInstanceOverviewControls } from '../model/adapters/training-instance-overview-controls';
import { TrainingInstanceTable } from '../model/adapters/training-instance-table';
import { TrainingInstanceOverviewService } from '../services/state/training-instance-overview.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, NgClass } from '@angular/common';
import { InstanceCountdownComponent } from './instance-countdown/instance-countdown.component';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { TrainingInstanceOverviewConcreteService } from '../services/state/training-instance-overview-concrete.service';
import { LogoSpinnerComponent, TableDateCellComponent } from '@crczp/components';
import { NotificationService, PaginationStorageService, providePaginationStorageService } from '@crczp/utils';

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
        InstanceCountdownComponent,
        TableDateCellComponent,
        MatTooltip,
        MatButton,
        MatIcon,
        CdkCopyToClipboard,
        NgClass,
        LogoSpinnerComponent,
    ],
    providers: [
        providePaginationStorageService(TrainingInstanceOverviewComponent),
        {
            provide: TrainingInstanceOverviewService,
            useClass: TrainingInstanceOverviewConcreteService,
        },
    ],
})
export class TrainingInstanceOverviewComponent {
    @Input() paginationId = 'training-instance-overview';
    readonly INITIAL_SORT_NAME = 'startTime';
    readonly INITIAL_SORT_DIR = 'desc';
    instances$: Observable<SentinelTable<TrainingInstance, string>>;
    hasError$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    controls: SentinelControlItem[];
    private service = inject(TrainingInstanceOverviewService);
    private paginationService = inject(PaginationStorageService);
    private notificationService = inject(NotificationService);

    constructor() {
        this.controls = TrainingInstanceOverviewControls.create(this.service);
        this.initTable();
    }

    onControlAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    onInstancesLoadEvent(loadEvent: TableLoadEvent<string>): void {
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
        const initLoadEvent: TableLoadEvent<string> = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.loadPageSize(),
                this.INITIAL_SORT_NAME,
                this.INITIAL_SORT_DIR,
            ),
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
