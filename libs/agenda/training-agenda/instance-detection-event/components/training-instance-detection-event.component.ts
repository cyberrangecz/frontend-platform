import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { AbstractDetectionEvent, TrainingInstance } from '@crczp/training-model';
import { map } from 'rxjs/operators';
import { DetectionEventTable } from '../model/detection-event-table';
import { DetectionEventService } from '../services/detection-event.service';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { DetectionEventConcreteService } from '../services/detection-event-concrete.service';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';

/**
 * Main component of training instance detection event.
 */
@Component({
    selector: 'crczp-training-instance-detection-event',
    templateUrl: './training-instance-detection-event.component.html',
    styleUrls: ['./training-instance-detection-event.component.css'],
    imports: [AsyncPipe, SentinelTableComponent],
    providers: [
        providePaginationStorageService(
            TrainingInstanceDetectionEventComponent,
        ),
        {
            provide: DetectionEventService,
            useClass: DetectionEventConcreteService,
        },
    ],
})
export class TrainingInstanceDetectionEventComponent implements OnInit {
    readonly INIT_SORT_NAME = 'levelId';
    readonly INIT_SORT_DIR = 'asc';
    cheatingDetectionId: number;
    detectionEvents$: Observable<SentinelTable<AbstractDetectionEvent, string>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    trainingInstanceId: number;
    destroyRef = inject(DestroyRef);
    private detectionEventService = inject(DetectionEventService);
    private paginationService = inject(PaginationStorageService);
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => {
                this.trainingInstanceId = data[TrainingInstance.name].id;
            });
        this.cheatingDetectionId =
            this.activeRoute.snapshot.params['trainingInstanceId'];
        this.initTable();
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(loadEvent: TableLoadEvent<string>): void {
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

    private initTable() {
        this.hasError$ = this.detectionEventService.hasError$;
        this.isLoading$ = this.detectionEventService.isLoading$;
        this.detectionEvents$ = this.detectionEventService.resource$.pipe(
            map(
                (resource) =>
                    new DetectionEventTable(
                        resource,
                        this.detectionEventService,
                    ),
            ),
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
