import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AccessedTrainingRun, SandboxWaitReasonEnum, TraineeSandbox } from '@crczp/training-model';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccessedTrainingRunTable } from '../model/accessed-training-run-table';
import { AccessedTrainingRunService } from '../services/state/accessed-training-run.service';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { AccessedTrainingRunControls } from '../model/accessed-training-run-controls';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { AccessTrainingRunComponent } from './access/access-training-run.component';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { AccessedTrainingRunSort } from '@crczp/training-api';
import { TableEmptyStateDirective } from '@crczp/components';
import { TrainingResolverHelperService } from '@crczp/routing-commons';
import { OwnSandboxesComponent } from './own-sandboxes/own-sandboxes.component';

const SANDBOX_WAIT_MESSAGES: Record<SandboxWaitReasonEnum, string> = {
    [SandboxWaitReasonEnum.PREPARING]:
        'Your sandbox is not ready yet. Once it is, enter the access token again or resume the training run below.',
    [SandboxWaitReasonEnum.FAILED]:
        'Your sandbox failed. Remove it, then enter the access token again to get a new one.',
    [SandboxWaitReasonEnum.REMOVING]:
        'Your sandbox is being removed. Once it is gone, enter the access token again to get a new one.',
    [SandboxWaitReasonEnum.BLOCKED]:
        'You can have only one sandbox at a time. Remove your other sandbox, or wait until its removal finishes, then enter the access token again.',
    [SandboxWaitReasonEnum.MISSING]:
        'This training run has no sandbox any more. Enter the access token again to get a new one.',
};

/**
 * Main smart component of the trainee overview.
 */
@Component({
    selector: 'crczp-trainee-overview',
    templateUrl: './training-run-overview.component.html',
    styleUrls: ['./training-run-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        AccessTrainingRunComponent,
        SentinelControlsComponent,
        SentinelTableComponent,
        TableEmptyStateDirective,
        MatIcon,
        OwnSandboxesComponent,
    ],
    providers: [AccessedTrainingRunService],
})
export class TrainingRunOverviewComponent implements OnInit {
    trainingRuns$: Observable<SentinelTable<AccessedTrainingRun, string>>;
    hasError$: Observable<boolean>;
    tableIsLoading$: Observable<boolean>;
    ownSandboxes$: Observable<TraineeSandbox[]>;
    /** Why the trainee was sent back here to wait for their sandbox, if they were */
    sandboxWaitMessage$: Observable<string | undefined>;
    isLoading = false;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private trainingRunOverviewService = inject(AccessedTrainingRunService);
    private route = inject(ActivatedRoute);
    private lastTableLoadEvent: TableLoadEvent<AccessedTrainingRunSort>;

    private readonly initialRunPagination =
        createPaginationEvent<AccessedTrainingRunSort>({
            sort: 'endTime',
            sortDir: 'desc',
        });

    constructor() {
        const trainingRunOverviewService = this.trainingRunOverviewService;

        this.controls = AccessedTrainingRunControls.create(
            trainingRunOverviewService,
        );
    }

    ngOnInit(): void {
        this.initTable();
        this.initOwnSandboxes();
    }

    /**
     * According to PIN number calls service to access training
     * @param accessToken token to access the training run
     */
    access(accessToken: string): void {
        this.isLoading = true;
        this.trainingRunOverviewService
            .toAccessRun(accessToken)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.isLoading = false;
                // Accessing may have created a run and a sandbox while keeping the trainee here
                this.loadAccessedTrainingRuns(this.lastTableLoadEvent);
                this.trainingRunOverviewService.refreshOwnSandboxes();
            });
    }

    removeOwnSandbox(sandbox: TraineeSandbox): void {
        this.trainingRunOverviewService
            .removeOwnSandbox(sandbox)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Loads training run data for the table component
     */
    loadAccessedTrainingRuns(
        loadEvent: TableLoadEvent<AccessedTrainingRunSort>,
    ): void {
        this.lastTableLoadEvent = loadEvent;
        this.trainingRunOverviewService
            .getAll(
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent<AccessedTrainingRunSort> = {
            pagination: this.initialRunPagination,
        };

        this.trainingRuns$ = this.trainingRunOverviewService.resource$.pipe(
            map(
                (resource) =>
                    new AccessedTrainingRunTable(
                        resource,
                        this.trainingRunOverviewService,
                    ),
            ),
        );
        this.hasError$ = this.trainingRunOverviewService.hasError$;
        this.tableIsLoading$ = this.trainingRunOverviewService.isLoading$;
        this.loadAccessedTrainingRuns(initialLoadEvent);
    }

    private initOwnSandboxes() {
        this.ownSandboxes$ = this.trainingRunOverviewService.ownSandboxes$;
        this.sandboxWaitMessage$ = this.route.queryParamMap.pipe(
            map(
                (params) =>
                    SANDBOX_WAIT_MESSAGES[
                        params.get(
                            TrainingResolverHelperService.SANDBOX_WAIT_PARAM,
                        ) as SandboxWaitReasonEnum
                    ],
            ),
        );
        this.trainingRunOverviewService
            .watchOwnSandboxes()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

}
