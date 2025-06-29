import { Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { SentinelTable, TableActionEvent, TableLoadEvent } from '@sentinel/components/table';
import { SentinelControlItem } from '@sentinel/components/controls';
import { DefaultPaginationService } from '@crczp/training-agenda/internal';
import { map, take } from 'rxjs/operators';
import { TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME, TrainingNavigator } from '../../../index';
import { CheatingDetectionOverviewControls } from '../model/cheating-detection-overview-controls';
import { CheatingDetectionService } from '../services/cheating-detection.service';
import { CheatingDetectionTable } from '../model/cheating-detection-table';
import { CheatingDetection, TrainingInstance } from '@crczp/training-model';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Main component of cheating detection.
 */
@Component({
    selector: 'crczp-cheating-detection-overview',
    templateUrl: './cheating-detection-overview.component.html',
    styleUrls: ['./cheating-detection-overview.component.css'],
})
export class CheatingDetectionOverviewComponent implements OnInit {
    @Input() paginationId = 'cheating-detection-overview';
    @Output() showCheatingDetectionCreate: EventEmitter<boolean> = new EventEmitter();
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'asc';

    trainingInstance$: Observable<TrainingInstance>;
    cheatingDetections$: Observable<SentinelTable<CheatingDetection>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    topControls: SentinelControlItem[] = [];
    trainingInstanceId: number;
    destroyRef = inject(DestroyRef);

    constructor(
        private activeRoute: ActivatedRoute,
        private cheatingDetectionService: CheatingDetectionService,
        private paginationService: PaginationStorageService,
        private navigator: TrainingNavigator,
    ) {
    }

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]),
        );
        this.trainingInstance$.subscribe((instance) => {
            this.trainingInstanceId = instance.id;
        });
        this.topControls = CheatingDetectionOverviewControls.createTopControls(
            this.cheatingDetectionService,
            this.trainingInstanceId,
        );
        this.initTable();
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.cheatingDetectionService
            .getAll(
                this.trainingInstanceId,
                new OffsetPaginationEvent(
                    0,
                    loadEvent.pagination.size,
                    loadEvent.pagination.sort,
                    loadEvent.pagination.sortDir,
                ),
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItem): void {
        control.result$.pipe(take(1)).subscribe();
    }

    /**
     * Resolves type of emitted event and calls appropriate handler
     * @param event action event emitted from table component
     */
    onTableAction(event: TableActionEvent<CheatingDetection>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    private initTable() {
        this.hasError$ = this.cheatingDetectionService.hasError$;
        this.isLoading$ = this.cheatingDetectionService.isLoading$;
        this.cheatingDetections$ = this.cheatingDetectionService.resource$.pipe(
            map((resource) => new CheatingDetectionTable(resource, this.cheatingDetectionService, this.navigator)),
        );
        const initialPagination = new OffsetPaginationEvent(
            0,
            this.paginationService.loadPageSize(),
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );
        this.onLoadEvent({ pagination: initialPagination });
    }
}
