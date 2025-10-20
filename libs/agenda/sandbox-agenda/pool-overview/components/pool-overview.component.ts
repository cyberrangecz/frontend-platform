import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import { Pool, Resources } from '@crczp/sandbox-model';
import { SentinelRowDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { defer, Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PoolTable } from '../model/pool-table';

import {
    SandboxAllocationUnitsConcreteService,
    SandboxAllocationUnitsService,
    SandboxInstanceService
} from '@crczp/sandbox-agenda/pool-detail';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SandboxResourcesService } from '../services/resources/sandbox-resources.service';
import {
    EditableCommentComponent,
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService
} from '@crczp/sandbox-agenda/internal';
import { PoolOverviewService } from '../services/state/pool-overview.service';
import { PoolService } from '../services/abstract-pool/abstract-sandbox/pool.service';
import { SandboxResourcesConcreteService } from '../services/resources/sandbox-resources-concrete.service';
import { TableStateCellComponent } from './table-state-cell/table-state-cell.component';
import { QuotasComponent } from './quotas/quotas.component';
import { AsyncPipe } from '@angular/common';
import { PaginationStorageService, PollingService, providePaginationStorageService } from '@crczp/utils';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { PoolSort } from '@crczp/sandbox-api';

/**
 * Smart component of sandbox pool overview page
 */
@Component({
    selector: 'crczp-sandbox-pool-overview',
    templateUrl: './pool-overview.component.html',
    styleUrls: ['./pool-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelControlsComponent,
        SentinelTableComponent,
        TableStateCellComponent,
        EditableCommentComponent,
        QuotasComponent,
        AsyncPipe,
        SentinelRowDirective,
    ],
    providers: [
        PollingService,
        { provide: PoolOverviewService, useClass: PoolOverviewService },
        {
            provide: SandboxInstanceService,
            useClass: SandboxInstanceService,
        },
        {
            provide: SandboxAllocationUnitsService,
            useClass: SandboxAllocationUnitsConcreteService,
        },
        PoolService,
        {
            provide: SandboxDefinitionOverviewService,
            useClass: SandboxDefinitionOverviewConcreteService,
        },
        {
            provide: SandboxResourcesService,
            useClass: SandboxResourcesConcreteService,
        },
        providePaginationStorageService(PoolOverviewComponent),
    ],
})
export class PoolOverviewComponent implements OnInit {
    @Input() paginationId = 'crczp-sandbox-pool-overview';
    pools$: Observable<PoolTable>;
    hasError$: Observable<boolean>;
    resources$: Observable<Resources>;
    controls: SentinelControlItem[] = [];
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN = 'id';
    readonly DEFAULT_SORT_DIRECTION = 'asc';
    private sandboxResourcesService = inject(SandboxResourcesService);
    private abstractPoolService = inject(PoolService);
    private sandboxInstanceService = inject(SandboxInstanceService);
    private paginationService = inject(PaginationStorageService);

    private readonly initialPoolPagination = createPaginationEvent<PoolSort>({
        sort: this.DEFAULT_SORT_COLUMN,
    });

    constructor() {
        this.resources$ = this.sandboxResourcesService.resources$;
    }

    ngOnInit(): void {
        this.initTable();
        this.initControls();
        this.initResources();
    }

    /**
     * Gets new data for pool overview table
     * @param loadEvent load data event from table component
     */
    onLoadEvent(loadEvent: TableLoadEvent<PoolSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.abstractPoolService
            .getAll(PaginationMapper.fromPaginationEvent(loadEvent.pagination))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    onControls(controlItem: SentinelControlItemSignal): void {
        controlItem.result$.pipe(take(1)).subscribe();
    }

    updatePoolComment(pool: Pool, newComment: string) {
        pool.comment = newComment;
        this.abstractPoolService
            .updateComment(pool)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    lockStateToIcon(lockState: 'locked' | 'unlocked'): string | null {
        if (lockState === 'locked') {
            return 'lock';
        } else if (lockState === 'unlocked') {
            return 'lock_open';
        }
        return null;
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent<PoolSort> = {
            pagination: this.initialPoolPagination,
        };
        this.pools$ = this.abstractPoolService.pools$.pipe(
            map(
                (resource) =>
                    new PoolTable(
                        resource,
                        this.resources$,
                        this.abstractPoolService,
                        this.sandboxInstanceService,
                    ),
            ),
        );
        this.hasError$ = this.abstractPoolService.poolsHasError$;
        this.onLoadEvent(initialLoadEvent);
    }

    private initControls() {
        this.controls = [
            new SentinelControlItem(
                'create',
                'Create',
                'primary',
                of(false),
                defer(() => this.abstractPoolService.create()),
            ),
        ];
    }

    private initResources() {
        this.sandboxResourcesService
            .getResources()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
