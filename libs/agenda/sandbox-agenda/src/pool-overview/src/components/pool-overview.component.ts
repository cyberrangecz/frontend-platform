import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { SentinelControlItem } from '@sentinel/components/controls';
import { Pool, Resources } from '@crczp/sandbox-model';
import { SentinelTable, TableActionEvent, TableLoadEvent } from '@sentinel/components/table';
import { defer, Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { PoolTable } from '../model/pool-table';
import { SandboxNavigator } from '@crczp/sandbox-agenda';
import { DefaultPaginationService } from '@crczp/sandbox-agenda/internal';
import { AbstractPoolService } from '../services/abstract-pool/abstract-sandbox/abstract-pool.service';
import { SandboxInstanceService } from '@crczp/sandbox-agenda/pool-detail';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SandboxResourcesService } from '../services/resources/sandbox-resources.service';

/**
 * Smart component of sandbox pool overview page
 */
@Component({
    selector: 'crczp-sandbox-pool-overview',
    templateUrl: './pool-overview.component.html',
    styleUrls: ['./pool-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
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

    constructor(
        private sandboxResourcesService: SandboxResourcesService,
        private abstractPoolService: AbstractPoolService,
        private sandboxInstanceService: SandboxInstanceService,
        private navigator: SandboxNavigator,
        private paginationService: DefaultPaginationService,
    ) {
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
        this.paginationService.setPagination(this.paginationId, loadEvent.pagination.size);
        this.abstractPoolService.getAll(loadEvent.pagination).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Resolves type of action and calls appropriate handler
     * @param event action event emitted from pool overview table
     */
    onPoolAction(event: TableActionEvent<Pool>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    onControls(controlItem: SentinelControlItem): void {
        controlItem.result$.pipe(take(1)).subscribe();
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(
                0,
                this.paginationService.getPagination(this.paginationId),
                this.DEFAULT_SORT_COLUMN,
                this.DEFAULT_SORT_DIRECTION,
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
                        this.navigator,
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
        this.sandboxResourcesService.getResources().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    updatePoolComment(pool: Pool, newComment: string) {
        pool.comment = newComment;
        this.abstractPoolService.updateComment(pool).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    lockStateToIcon(lockState: 'locked' | 'unlocked'): string | null {
        if (lockState === 'locked') {
            return 'lock';
        } else if (lockState === 'unlocked') {
            return 'lock_open';
        }
        return null;
    }
}
