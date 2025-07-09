import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit,} from '@angular/core';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import {Pool, Resources} from '@crczp/sandbox-model';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableActionEvent,
    TableLoadEvent,
} from '@sentinel/components/table';
import {defer, Observable, of} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {PoolTable} from '../model/pool-table';
import {SandboxDefaultNavigator, SandboxNavigator,} from '@crczp/sandbox-agenda';

import {AbstractPoolService} from '../services/abstract-pool/abstract-sandbox/abstract-pool.service';
import {
    SandboxAllocationUnitsConcreteService,
    SandboxAllocationUnitsService,
    SandboxInstanceConcreteService,
    SandboxInstanceService,
} from '@crczp/sandbox-agenda/pool-detail';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SandboxResourcesService} from '../services/resources/sandbox-resources.service';
import {PoolBreadcrumbResolver, PoolCommentResolver, PoolResolver,} from '@crczp/sandbox-agenda/resolvers';
import {
    EditableCommentComponent,
    ResourcePollingService,
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService,
} from '@crczp/sandbox-agenda/internal';
import {PoolOverviewService} from '../services/state/pool-overview/pool-overview.service';
import {PoolOverviewConcreteService} from '../services/state/pool-overview/pool-overview-concrete.service';
import {AbstractPoolConcreteService} from '../services/abstract-pool/abstract-sandbox/abstract-pool-concrete.service';
import {SandboxResourcesConcreteService} from '../services/resources/sandbox-resources-concrete.service';
import {PaginationStorageService, providePaginationStorageService} from '@crczp/common';
import {TableStateCellComponent} from './table-state-cell/table-state-cell.component';
import {QuotasComponent} from './quotas/quotas.component';
import {AsyncPipe} from '@angular/common';

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
        PoolResolver,
        PoolBreadcrumbResolver,
        PoolCommentResolver,
        ResourcePollingService,
        {provide: SandboxNavigator, useClass: SandboxDefaultNavigator},
        {provide: PoolOverviewService, useClass: PoolOverviewConcreteService},
        {
            provide: SandboxInstanceService,
            useClass: SandboxInstanceConcreteService,
        },
        {
            provide: SandboxAllocationUnitsService,
            useClass: SandboxAllocationUnitsConcreteService,
        },
        {provide: AbstractPoolService, useClass: AbstractPoolConcreteService},
        {
            provide: SandboxDefinitionOverviewService,
            useClass: SandboxDefinitionOverviewConcreteService,
        },
        {
            provide: SandboxResourcesService,
            useClass: SandboxResourcesConcreteService,
        },
        providePaginationStorageService(PoolOverviewComponent)
    ],
})
export class PoolOverviewComponent implements OnInit {
    @Input() paginationId = 'crczp-sandbox-pool-overview';
    pools$: Observable<SentinelTable<Pool>>;
    hasError$: Observable<boolean>;
    resources$: Observable<Resources>;
    controls: SentinelControlItem[] = [];
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN = 'id';
    readonly DEFAULT_SORT_DIRECTION = 'asc';
    private sandboxResourcesService = inject(SandboxResourcesService);
    private abstractPoolService = inject(AbstractPoolService);
    private sandboxInstanceService = inject(SandboxInstanceService);
    private navigator = inject(SandboxNavigator);
    private paginationService = inject(PaginationStorageService);

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
    onLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.abstractPoolService
            .getAll(loadEvent.pagination)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Resolves type of action and calls appropriate handler
     * @param event action event emitted from pool overview table
     */
    onPoolAction(event: TableActionEvent<Pool>): void {
        event.action.result$.pipe(take(1)).subscribe();
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
        const initialLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.loadPageSize()
            ),
        };
        this.pools$ = this.abstractPoolService.pools$.pipe(
            map(
                (resource) =>
                    new PoolTable(
                        resource,
                        this.resources$,
                        this.abstractPoolService,
                        this.sandboxInstanceService,
                        this.navigator
                    )
            )
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
                defer(() => this.abstractPoolService.create())
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
