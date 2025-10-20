import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import {
    TrainingDefinition,
    TrainingDefinitionStateEnum,
} from '@crczp/training-model';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { TrainingDefinitionOverviewControls } from '../model/training-definition-overview-controls';
import { TrainingDefinitionTable } from '../model/training-definition-table';
import { TrainingDefinitionService } from '../services/state/training-definition.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import {
    TableDateCellComponent,
    TableStateCellComponent,
} from '@crczp/components';
import {
    FileUploadProgressService,
    PaginationStorageService,
} from '@crczp/utils';
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
        TableDateCellComponent,
        SentinelRowDirective,
        TableStateCellComponent,
    ],
    providers: [
        FileUploadProgressService,
        {
            provide: TrainingDefinitionService,
            useClass: TrainingDefinitionService,
        },
    ],
})
export class CommonTrainingDefinitionOverviewComponent implements OnInit {
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'desc';

    trainingDefinitions$: Observable<SentinelTable<TrainingDefinition, string>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    topControls: SentinelControlItem[] = [];
    bottomControls: SentinelControlItem[] = [];
    destroyRef = inject(DestroyRef);
    private trainingDefinitionService = inject(TrainingDefinitionService);
    private paginationService = inject(PaginationStorageService);

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
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.trainingDefinitionService
            .getAll(
                PaginationMapper.fromPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
    }

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
                sort: 'id',
                pageSize: this.paginationService.loadPageSize(),
            }),
        });
    }
}
