import {Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {async, Observable} from 'rxjs';
import {SentinelTable, SentinelTableComponent, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {AbstractDetectionEvent} from '@crczp/training-model';
import {TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME, TrainingNavigator} from '@crczp/training-agenda';
import {map, take} from 'rxjs/operators';
import {DetectionEventTable} from '../model/detection-event-table';
import {DetectionEventService} from '../services/detection-event.service';
import {ActivatedRoute} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PaginationStorageService} from "@crczp/common";
import {AsyncPipe} from "@angular/common";

/**
 * Main component of training instance detection event.
 */
@Component({
    selector: 'crczp-training-instance-detection-event',
    templateUrl: './training-instance-detection-event.component.html',
    styleUrls: ['./training-instance-detection-event.component.css'],
    imports: [
        AsyncPipe,
        SentinelTableComponent
    ]
})
export class TrainingInstanceDetectionEventComponent implements OnInit {
    private detectionEventService = inject(DetectionEventService);
    private paginationService = inject(PaginationStorageService);
    private activeRoute = inject(ActivatedRoute);
    private navigator = inject(TrainingNavigator);

    @Input() paginationId = 'training-instance-detection-event';
    readonly INIT_SORT_NAME = 'levelId';
    readonly INIT_SORT_DIR = 'asc';

    cheatingDetectionId: number;
    detectionEvents$: Observable<SentinelTable<AbstractDetectionEvent>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    trainingInstanceId: number;
    destroyRef = inject(DestroyRef);
    protected readonly async = async;

    ngOnInit(): void {
        this.activeRoute.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
            this.trainingInstanceId = data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME].id;
        });
        this.cheatingDetectionId = this.activeRoute.snapshot.params['trainingInstanceId'];
        this.initTable();
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.detectionEventService
            .getAll(
                this.cheatingDetectionId,
                this.trainingInstanceId,
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
     * Resolves type of emitted event and calls appropriate handler
     * @param event action event emitted from table component
     */
    onTableAction(event: TableActionEvent<AbstractDetectionEvent>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    private initTable() {
        this.hasError$ = this.detectionEventService.hasError$;
        this.isLoading$ = this.detectionEventService.isLoading$;
        this.detectionEvents$ = this.detectionEventService.resource$.pipe(
            map((resource) => new DetectionEventTable(resource, this.detectionEventService, this.navigator)),
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
