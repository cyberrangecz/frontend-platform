import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SortDir } from '@sentinel/common/pagination';
import { createPaginationEvent, OffsetPaginatedResource, PaginationMapper } from '@crczp/api-common';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { Pool, RequestStageState, SandboxAllocationUnit } from '@crczp/sandbox-model';
import { SentinelRowDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { Observable, Subscription } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AllocationRequestsService } from '../services/state/request/allocation/requests/allocation-requests.service';
import { CleanupRequestsService } from '../services/state/request/cleanup/cleanup-requests.service';
import { PoolDetailControls } from './pool-detail-controls';
import {
    AllocationRequestsConcreteService
} from '../services/state/request/allocation/requests/allocation-requests-concrete.service';
import { CleanupRequestsConcreteService } from '../services/state/request/cleanup/cleanup-requests-concrete.service';
import { PoolDetailTable } from '../model/pool-detail-table';
import { AbstractSandbox } from '../model/abstract-sandbox';
import { SelectedStage } from '../model/selected-stage';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard } from '@angular/material/card';
import { StageOverviewComponent } from './stage-overview/stage-overview.component';
import { AsyncPipe } from '@angular/common';
import { PaginationStorageService, PollingService, providePaginationStorageService } from '@crczp/utils';
import { EditableCommentComponent } from '@crczp/sandbox-agenda/internal';
import {
    SandboxAllocationUnitsService
} from '../services/state/sandbox-allocation-unit/sandbox-allocation-units.service';
import {
    SandboxAllocationUnitsConcreteService
} from '../services/state/sandbox-allocation-unit/sandbox-allocation-units-concrete.service';
import { SandboxInstanceService } from '../services/state/sandbox-instance/sandbox-instance.service';
import { AllocationRequestSort, PoolSort, SandboxInstanceSort } from '@crczp/sandbox-api';

/**
 * Smart component of pool detail page
 */
@Component({
    selector: 'crczp-pool-detail',
    templateUrl: './pool-detail.component.html',
    styleUrls: ['./pool-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        PollingService,
        {
            provide: AllocationRequestsService,
            useClass: AllocationRequestsConcreteService,
        },
        {
            provide: CleanupRequestsService,
            useClass: CleanupRequestsConcreteService,
        },
        {
            provide: SandboxAllocationUnitsService,
            useClass: SandboxAllocationUnitsConcreteService,
        },
        SandboxInstanceService,
        providePaginationStorageService(PoolDetailComponent),
    ],
    imports: [
        SentinelControlsComponent,
        MatCard,
        SentinelTableComponent,
        StageOverviewComponent,
        EditableCommentComponent,
        AsyncPipe,
        SentinelRowDirective,
    ],
})
export class PoolDetailComponent implements OnInit, AfterViewInit {
    pool: Pool;
    instances$: Observable<PoolDetailTable>;
    instancesTableHasError$: Observable<boolean>;
    controls: SentinelControlItem[];
    commentTrim = 15;
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN: PoolSort = 'id';
    readonly DEFAULT_SORT_DIRECTION: SortDir = 'asc';
    private sandboxInstanceService = inject(SandboxInstanceService);
    private paginationService = inject(PaginationStorageService);
    private activeRoute = inject(ActivatedRoute);
    private subscription: Subscription;
    private readonly initAllocationRequestPagination =
        createPaginationEvent<AllocationRequestSort>({});

    private pageSize = this.paginationService.loadPageSize();

    private readonly initSandboxPagination =
        createPaginationEvent<SandboxInstanceSort>({
            sort: 'id',
            sortDir: 'asc',
        });

    ngOnInit(): void {
        this.initTable();
        this.initControls();
    }

    ngAfterViewInit() {
        this.computeCommentTrim();
    }

    /**
     * Gets new data for sandbox instance overview table
     * @param loadEvent load event emitted from sandbox instances table
     */
    onLoadEvent(loadEvent: TableLoadEvent<AllocationRequestSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        this.subscription = this.sandboxInstanceService
            .getAllUnits(
                this.pool.id,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
            )
            .pipe(takeUntilDestroyed(this.destroyRef), take(1))
            .subscribe();
    }

    onStageAction(selectedStage: SelectedStage): void {
        if (selectedStage.state === RequestStageState.RETRY) {
            this.sandboxInstanceService
                .retryAllocate(selectedStage.unitId)
                .pipe(take(1))
                .subscribe();
        }
        this.sandboxInstanceService
            .navigateToStage(
                this.pool.id,
                selectedStage.unitId,
                selectedStage.order,
            )
            .pipe(take(1))
            .subscribe();
    }

    /**
     * Dynamically compute the length of comment to display
     */
    computeCommentTrim() {
        const element = document.querySelector('.cdk-column-comment');
        const columnWidth = parseFloat(getComputedStyle(element)['width']);
        const fontSize = 9.5;
        this.commentTrim = +(columnWidth / fontSize).toFixed();
    }

    updateInstanceComment(row: SandboxAllocationUnit, comment: string) {
        row.comment = comment;
        row.id = row['unitId'];
        this.sandboxInstanceService
            .updateComment(row)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent<AllocationRequestSort> = {
            pagination: this.initAllocationRequestPagination,
        };
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                this.pool = data[Pool.name];
                this.onLoadEvent(initialLoadEvent);
            });

        const sandboxes$ = this.sandboxInstanceService.allocationUnits$.pipe(
            map((resource) => {
                return resource.elements.map(
                    (allocationUnit) => new AbstractSandbox(allocationUnit),
                );
            }),
        );

        this.instances$ = sandboxes$.pipe(
            map(
                (data) =>
                    new PoolDetailTable(
                        this.mapSandboxesToPaginatedResource(data),
                        this.sandboxInstanceService,
                    ),
            ),
        );
    }

    private mapSandboxesToPaginatedResource(
        sandboxes: AbstractSandbox[],
    ): OffsetPaginatedResource<AbstractSandbox> {
        const pagination = PaginationMapper.fromArray(
            sandboxes,
            this.paginationService.loadPageSize(),
        );
        return new OffsetPaginatedResource<AbstractSandbox>(
            sandboxes,
            pagination,
        );
    }

    private initControls() {
        const sandboxes$ = this.sandboxInstanceService.allocationUnits$.pipe(
            map((resource) => {
                this.controls = PoolDetailControls.create(
                    this.pool,
                    resource.elements.map(
                        (allocationUnit) => new AbstractSandbox(allocationUnit),
                    ),
                    this.sandboxInstanceService,
                );
                return resource.elements.map(
                    (allocationUnit) => new AbstractSandbox(allocationUnit),
                );
            }),
        );
        sandboxes$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
}
