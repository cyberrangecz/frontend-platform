import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import { SandboxDefinition } from '@crczp/sandbox-model';
import {
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { SandboxDefinitionTable } from '../model/sandbox-definition-table';
import {
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService,
} from '@crczp/sandbox-agenda/internal';
import { SandboxDefinitionOverviewControls } from './sandbox-definition-overview-controls';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import {
    PaginationStorageService,
    providePaginationStorageService,
} from '@crczp/utils';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { SandboxDefinitionSort } from '@crczp/sandbox-api';

@Component({
    selector: 'crczp-sandbox-definition-overview',
    templateUrl: './sandbox-definition-overview.component.html',
    styleUrls: ['./sandbox-definition-overview.component.scss'],
    imports: [SentinelControlsComponent, SentinelTableComponent, AsyncPipe],
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
    @Input() paginationId = 'crczp-sandbox-definition-overview';
    controls: SentinelControlItem[];
    sandboxDefinitions$: Observable<SentinelTable<SandboxDefinition, string>>;
    hasError$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private sandboxDefinitionService = inject(SandboxDefinitionOverviewService);
    private paginationService = inject(PaginationStorageService);
    private lastLoadEvent: TableLoadEvent<SandboxDefinitionSort> = {
        pagination: createPaginationEvent({
            sort: 'name',
        }),
    };

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
        this.paginationService.savePageSize(event.pagination.size);
        this.sandboxDefinitionService
            .getAll(PaginationMapper.fromPaginationEvent(event.pagination))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Navigates to create sandbox definition page
     */
    onControlsActions(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
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
        this.onLoadEvent(this.lastLoadEvent);
        this.hasError$ = this.sandboxDefinitionService.hasError$;
    }
}
