import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {
    SentinelControlItem,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import {
    SentinelCellDirective,
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SandboxDefinitionTable } from '../model/sandbox-definition-table';
import {
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService,
} from '@crczp/sandbox-agenda/internal';
import { SandboxDefinitionOverviewControls } from './sandbox-definition-overview-controls';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import {
    OffsetPaginationEvent,
    PaginationStorageService,
    providePaginationStorageService,
    SortDir,
} from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { SandboxDefinitionSort } from '@crczp/sandbox-api';
import { TableEmptyStateDirective } from '@crczp/components';

@Component({
    selector: 'crczp-sandbox-definition-overview',
    templateUrl: './sandbox-definition-overview.component.html',
    styleUrls: ['./sandbox-definition-overview.component.scss'],
    imports: [
        SentinelControlsComponent,
        SentinelTableComponent,
        SentinelCellDirective,
        AsyncPipe,
        TableEmptyStateDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: SandboxDefinitionOverviewService,
            useClass: SandboxDefinitionOverviewConcreteService,
        },
        providePaginationStorageService(SandboxDefinitionOverviewComponent),
    ],
})

/**
 * Component displaying overview of sandbox definitions. Contains button for create sandbox definitions,
 * table with all sandbox definitions and possible actions on sandbox definition.
 */
export class SandboxDefinitionOverviewComponent implements OnInit {
    controls: SentinelControlItem[];
    sandboxDefinitions$: Observable<SandboxDefinitionTable>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    readonly DEFAULT_SORT_COLUMN: SandboxDefinitionSort = 'id';
    readonly DEFAULT_SORT_DIRECTION: SortDir = 'asc';
    private sandboxDefinitionService = inject(SandboxDefinitionOverviewService);
    private paginationService = inject(PaginationStorageService);
    private readonly initialPagination =
        this.paginationService.createPagination<SandboxDefinitionSort>(
            this.DEFAULT_SORT_COLUMN,
            this.DEFAULT_SORT_DIRECTION,
        );
    private pagination = this.initialPagination;

    ngOnInit(): void {
        this.controls = SandboxDefinitionOverviewControls.create(
            this.sandboxDefinitionService,
        );
        this.initTable();
    }

    /**
     * Refreshes table with new data
     * @param event to load data
     */
    onLoadEvent(event: TableLoadEvent<SandboxDefinitionSort>): void {
        if (event.pagination) {
            this.pagination = event.pagination as OffsetPaginationEvent<SandboxDefinitionSort>;
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.sandboxDefinitionService
            .getAll(PaginationMapper.toOffsetPaginationEvent(this.pagination))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        this.sandboxDefinitions$ = this.sandboxDefinitionService.resource$.pipe(
            map(
                (resource) =>
                    new SandboxDefinitionTable(
                        resource,
                        this.sandboxDefinitionService,
                    ),
            ),
        );
        this.onLoadEvent({ pagination: this.initialPagination });
        this.hasError$ = this.sandboxDefinitionService.hasError$;
        this.isLoading$ = this.sandboxDefinitionService.isLoading$;
    }
}
