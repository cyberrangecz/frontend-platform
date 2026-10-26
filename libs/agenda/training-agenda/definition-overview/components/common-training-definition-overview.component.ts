import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { TrainingDefinition, TrainingDefinitionStateEnum } from '@crczp/training-model';
import { SentinelCellDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { SentinelFilterFreeInputComponent } from '@sentinel/components/filters';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainingDefinitionOverviewControls } from '../model/training-definition-overview-controls';
import { TrainingDefinitionTable } from '../model/training-definition-table';
import { TrainingDefinitionService } from '../services/state/training-definition.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import {
    TableDateCellComponent,
    TableEmptyStateDirective,
    TableModel,
    TableStateCellComponent
} from '@crczp/components';
import { FileUploadProgressService, OffsetPaginationEvent, PaginationStorageService, SortDir } from '@crczp/utils';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { TrainingDefinitionSort } from '@crczp/training-api';

/**
 * Main smart component of training definition overview
 */
@Component({
    selector: 'crczp-common-training-definition-overview',
    templateUrl: './common-training-definition-overview.component.html',
    styleUrls: ['./common-training-definition-overview.component.css'],
    imports: [
        AsyncPipe,
        SentinelControlsComponent,
        SentinelTableComponent,
        SentinelCellDirective,
        SentinelFilterFreeInputComponent,
        RouterLink,
        TableDateCellComponent,
        TableStateCellComponent,
        TableEmptyStateDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        FileUploadProgressService,
        {
            provide: TrainingDefinitionService,
            useClass: TrainingDefinitionService,
        },
    ],
})
export class CommonTrainingDefinitionOverviewComponent implements OnInit {
    readonly INIT_SORT_NAME: TrainingDefinitionSort = 'lastEdited';
    readonly INIT_SORT_DIR: SortDir = 'desc';
    readonly PAGE_SIZE_OPTIONS = [10, 25, 50];

    trainingDefinitions$: Observable<TableModel<TrainingDefinition, TrainingDefinitionSort>>;
    /**
     * Text the training definitions are currently filtered by
     */
    filter = '';
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    topControls: SentinelControlItem[] = [];
    bottomControls: SentinelControlItem[] = [];
    destroyRef = inject(DestroyRef);
    private trainingDefinitionService = inject(TrainingDefinitionService);
    private paginationService = inject(PaginationStorageService);
    private pagination: OffsetPaginationEvent<TrainingDefinitionSort>;

    ngOnInit(): void {
        this.topControls = TrainingDefinitionOverviewControls.createTopControls(
            this.trainingDefinitionService,
        );
        this.bottomControls =
            TrainingDefinitionOverviewControls.createBottomControls(
                this.trainingDefinitionService,
            );
        this.initTable();
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(loadEvent: TableLoadEvent<TrainingDefinitionSort>): void {
        if (loadEvent.pagination) {
            this.pagination = PaginationMapper.toOffsetPaginationEvent(
                loadEvent.pagination,
            );
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.load();
    }

    /**
     * Reloads the training definitions from the first page, filtered by the given text
     * @param filter text to filter training definitions by, empty for no filter
     */
    onFilter(filter: string): void {
        this.filter = filter;
        this.pagination = { ...this.pagination, page: 0 };
        this.load();
    }

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */

    stateToIcon(value: TrainingDefinitionStateEnum): string {
        switch (value) {
            case TrainingDefinitionStateEnum.Unreleased:
                return 'lock_open';
            case TrainingDefinitionStateEnum.Released:
                return 'lock';
            case TrainingDefinitionStateEnum.Archived:
                return 'archive';
        }
    }

    private load(): void {
        this.trainingDefinitionService
            .getAll(this.pagination, this.filter || undefined)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        this.hasError$ = this.trainingDefinitionService.hasError$;
        this.isLoading$ = this.trainingDefinitionService.isLoading$;
        this.trainingDefinitions$ =
            this.trainingDefinitionService.resource$.pipe(
                map(
                    (resource) =>
                        new TrainingDefinitionTable(
                            resource,
                            this.trainingDefinitionService,
                        ),
                ),
            );
        this.onLoadEvent({
            pagination: createPaginationEvent({
                sort: this.INIT_SORT_NAME,
                sortDir: this.INIT_SORT_DIR,
                pageSize: this.paginationService.loadPageSize(),
            }),
        });
    }
}
