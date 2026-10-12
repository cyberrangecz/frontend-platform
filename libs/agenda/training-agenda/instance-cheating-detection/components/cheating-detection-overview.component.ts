import { Component, DestroyRef, EventEmitter, inject, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { SentinelCellDirective, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { filter, map } from 'rxjs/operators';
import { CheatingDetectionOverviewControls } from '../model/cheating-detection-overview-controls';
import { CheatingDetectionService } from '../services/cheating-detection.service';
import { CheatingDetectionTable } from '../model/cheating-detection-table';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { AsyncPipe } from '@angular/common';
import { StageOverviewComponent } from './stage-overview/stage-overview.component';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';
import { CheatingDetection, TrainingInstance } from '@crczp/training-model';
import { PaginationMapper } from '@crczp/api-common';
import { CheatingDetectionSort } from '@crczp/training-api';

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
        SentinelCellDirective,
        TableEmptyStateDirective,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        CheatingDetectionService,
        providePaginationStorageService(CheatingDetectionOverviewComponent),
    ],
})
export class CheatingDetectionOverviewComponent implements OnInit {
    @Output() showCheatingDetectionCreate: EventEmitter<boolean> =
        new EventEmitter();
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'asc';
    trainingInstance$: Observable<TrainingInstance>;
    cheatingDetections$: Observable<TableModel<CheatingDetection, string>>;
    hasError$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    topControls: SentinelControlItem[] = [];
    trainingInstanceId: number;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private cheatingDetectionService = inject(CheatingDetectionService);
    private paginationService = inject(PaginationStorageService);
    private readonly initialPagination =
        this.paginationService.createPagination<CheatingDetectionSort>(
            this.INIT_SORT_NAME,
        );
    private pagination = this.initialPagination;

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            filter((data) => !!data[TrainingInstance.name]),
            map((data) => data[TrainingInstance.name]),
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
    onLoadEvent(loadEvent: TableLoadEvent<CheatingDetectionSort>): void {
        if (loadEvent.pagination) {
            this.pagination = PaginationMapper.toOffsetPaginationEvent(
                loadEvent.pagination,
            );
        }
        this.paginationService.savePageSize(this.pagination.size);
        this.cheatingDetectionService
            .getAll(this.trainingInstanceId, this.pagination)
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
        this.onLoadEvent({ pagination: this.initialPagination });
    }
}
