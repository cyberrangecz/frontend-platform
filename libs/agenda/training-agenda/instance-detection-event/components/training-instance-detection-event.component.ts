import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { AbstractDetectionEvent, TrainingInstance } from '@crczp/training-model';
import { filter, map } from 'rxjs/operators';
import { DetectionEventTable } from '../model/detection-event-table';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { PaginationMapper } from '@crczp/api-common';
import { DetectionEventConcreteService } from '../services/detection-event-concrete.service';
import { AbstractDetectionEventSort } from '@crczp/training-api';
import { Routing } from '@crczp/routing-commons';

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
        DetectionEventConcreteService,
    ],
})
export class TrainingInstanceDetectionEventComponent implements OnInit {
    readonly INIT_SORT_NAME = 'levelId';
    readonly INIT_SORT_DIR = 'asc';
    cheatingDetectionId: number;
    detectionEvents$: Observable<
        SentinelTable<AbstractDetectionEvent, AbstractDetectionEventSort>
    >;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    trainingInstanceId: number;
    destroyRef = inject(DestroyRef);
    private detectionEventConcreteService = inject(
        DetectionEventConcreteService,
    );
    private paginationService = inject(PaginationStorageService);
    private activeRoute = inject(ActivatedRoute);
    private readonly initialPagination =
        this.paginationService.createPagination<AbstractDetectionEventSort>(
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );

    ngOnInit(): void {
        this.activeRoute.data
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                filter((data) => !!data[TrainingInstance.name]),
            )
            .subscribe((data) => {
                this.trainingInstanceId = data[TrainingInstance.name].id;
            });
        this.cheatingDetectionId = Number(
            Routing.Utils.extractVariable<'linear-instance'>(
                'detectionId',
                this.activeRoute.snapshot,
            ),
        );
        this.initTable();
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEvent(loadEvent: TableLoadEvent<AbstractDetectionEventSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.detectionEventConcreteService
            .getAll(
                this.cheatingDetectionId,
                this.trainingInstanceId,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        this.hasError$ = this.detectionEventConcreteService.hasError$;
        this.isLoading$ = this.detectionEventConcreteService.isLoading$;
        this.detectionEvents$ =
            this.detectionEventConcreteService.resource$.pipe(
                map(
                    (resource) =>
                        new DetectionEventTable(
                            resource,
                            this.detectionEventConcreteService,
                        ),
                ),
            );
        this.onLoadEvent({ pagination: this.initialPagination });
    }
}
