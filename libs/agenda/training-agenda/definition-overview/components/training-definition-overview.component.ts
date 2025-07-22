import {Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {TrainingDefinition, TrainingDefinitionStateEnum} from '@crczp/training-model';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableActionEvent,
    TableLoadEvent
} from '@sentinel/components/table';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {TrainingDefinitionOverviewControls} from '../model/training-definition-overview-controls';
import {TrainingDefinitionTable} from '../model/training-definition-table';
import {TrainingDefinitionService} from '../services/state/training-definition.service';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
    PaginationStorageService,
    providePaginationStorageService,
    TableDateCellComponent,
    TableStateCellComponent
} from "@crczp/common";
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from "@sentinel/components/controls";
import {AsyncPipe} from "@angular/common";
import {FileUploadProgressService} from "../services/file-upload/file-upload-progress.service";
import {TrainingDefinitionConcreteService} from "../services/state/training-definition.concrete.service";

/**
 * Main smart component of training definition overview
 */
@Component({
    selector: 'crczp-training-definition-overview',
    templateUrl: './training-definition-overview.component.html',
    styleUrls: ['./training-definition-overview.component.css'],
    imports: [
        AsyncPipe,
        SentinelControlsComponent,
        SentinelTableComponent,
        TableStateCellComponent,
        TableDateCellComponent,
        SentinelRowDirective
    ],
    providers: [
        FileUploadProgressService,
        {provide: TrainingDefinitionService, useClass: TrainingDefinitionConcreteService},
        providePaginationStorageService(TrainingDefinitionOverviewComponent)
    ],
})
export class TrainingDefinitionOverviewComponent implements OnInit {
    @Input() paginationId = 'training-definition-overview';
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'desc';
    trainingDefinitions$: Observable<SentinelTable<TrainingDefinition>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    topControls: SentinelControlItem[] = [];
    bottomControls: SentinelControlItem[] = [];
    destroyRef = inject(DestroyRef);
    private trainingDefinitionService = inject(TrainingDefinitionService);
    private paginationService = inject(PaginationStorageService);

    ngOnInit(): void {
        this.topControls = TrainingDefinitionOverviewControls.createTopControls(this.trainingDefinitionService);
        this.bottomControls = TrainingDefinitionOverviewControls.createBottomControls(this.trainingDefinitionService);
        this.initTable();
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.trainingDefinitionService
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

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(take(1)).subscribe();
    }

    /**
     * Resolves type of emitted event and calls appropriate handler
     * @param event action event emitted from table component
     */
    onTableAction(event: TableActionEvent<TrainingDefinition>): void {
        event.action.result$.pipe(take(1)).subscribe();
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
        this.trainingDefinitions$ = this.trainingDefinitionService.resource$.pipe(
            map((resource) => new TrainingDefinitionTable(resource, this.trainingDefinitionService)),
        );
        const initialPagination = new OffsetPaginationEvent(
            0,
            this.paginationService.loadPageSize(),
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );
        this.onLoadEvent({pagination: initialPagination});
    }
}
