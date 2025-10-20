import { Component, DestroyRef, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import {
    SentinelRowDirective,
    SentinelTable,
    SentinelTableComponent,
    TableLoadEvent
} from '@sentinel/components/table';
import { map } from 'rxjs/operators';
import { CheatingDetectionOverviewControls } from '../model/cheating-detection-overview-controls';
import { CheatingDetectionService } from '../services/cheating-detection.service';
import { CheatingDetectionTable } from '../model/cheating-detection-table';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { AsyncPipe } from '@angular/common';
import { StageOverviewComponent } from './stage-overview/stage-overview.component';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { CheatingDetection, TrainingInstance } from '@crczp/training-model';

/**
 * Main component of cheating detection.
 */
@Component({
    selector: 'crczp-cheating-detection-overview',
    templateUrl: './cheating-detection-overview.component.html',
    styleUrls: ['./cheating-detection-overview.component.css'],
    imports: [
        AsyncPipe,
        SentinelTableComponent,
        SentinelControlsComponent,
        StageOverviewComponent,
        SentinelRowDirective,
    ],
    providers: [
        {
            provide: CheatingDetectionService,
            useClass: CheatingDetectionService,
        },
        providePaginationStorageService(CheatingDetectionOverviewComponent),
    ],
})
export class CheatingDetectionOverviewComponent implements OnInit {
    @Output() showCheatingDetectionCreate: EventEmitter<boolean> =
        new EventEmitter();
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'asc';
    trainingInstance$: Observable<TrainingInstance>;
    cheatingDetections$: Observable<SentinelTable<CheatingDetection, string>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    topControls: SentinelControlItem[] = [];
    trainingInstanceId: number;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private cheatingDetectionService = inject(CheatingDetectionService);
    private paginationService = inject(PaginationStorageService);

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[TrainingInstance.name] || null),
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
    onLoadEvent(loadEvent: TableLoadEvent<string>): void {
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

    private initTable() {
        this.hasError$ = this.cheatingDetectionService.hasError$;
        this.isLoading$ = this.cheatingDetectionService.isLoading$;
        this.cheatingDetections$ = this.cheatingDetectionService.resource$.pipe(
            map(
                (resource) =>
                    new CheatingDetectionTable(
                        resource,
                        this.cheatingDetectionService,
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
