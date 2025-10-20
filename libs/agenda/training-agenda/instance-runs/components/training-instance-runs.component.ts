import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { TableLoadEvent } from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { TrainingRunTable } from '../model/training-run-table';
import { TrainingRunService } from '../services/runs/training-run.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard } from '@angular/material/card';
import { TrainingRunOverviewComponent } from './training-run-overview/training-run-overview.component';
import { AsyncPipe } from '@angular/common';
import { PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { createPaginationEvent, OffsetPaginatedResource, PaginationMapper } from '@crczp/api-common';
import { TrainingRunSort } from '@crczp/training-api';

/**
 * Smart component of training instance runs
 */
@Component({
    selector: 'crczp-training-instance-runs',
    templateUrl: './training-instance-runs.component.html',
    styleUrls: ['./training-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        { provide: TrainingRunService, useClass: TrainingRunService },
        providePaginationStorageService(TrainingInstanceRunsComponent),
    ],
    imports: [MatCard, TrainingRunOverviewComponent, AsyncPipe],
})
export class TrainingInstanceRunsComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    trainingRuns$: Observable<TrainingRunTable>;
    trainingRunsHasError$: Observable<boolean>;
    loadingTrainingRuns$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private paginationService = inject(PaginationStorageService);
    private trainingRunService = inject(TrainingRunService);
    private trainingInstance: TrainingInstance;

    private readonly initialRunPagination =
        createPaginationEvent<TrainingRunSort>({
            sort: 'endTime',
            sortDir: 'desc',
        });

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            map((data) => data[TrainingInstance.name] || null),
            tap((ti) => {
                this.trainingInstance = ti;
            }),
        );
        this.initRunsOverviewComponent();
    }

    onTrainingRunsLoadEvent(loadEvent: TableLoadEvent<TrainingRunSort>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.trainingRunService
            .getAll(
                this.trainingInstance.id,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initRunsOverviewComponent() {
        this.trainingInstance$
            .pipe(
                take(1),
                switchMap((ti) =>
                    this.trainingRunService.getAll(
                        ti.id,
                        this.initialRunPagination,
                    ),
                ),
            )
            .subscribe();

        this.trainingRuns$ = this.trainingRunService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => {
                return new TrainingRunTable(
                    OffsetPaginatedResource.fromPaginatedElements(resource),
                    this.trainingRunService,
                    this.trainingInstance,
                );
            }),
        );

        this.trainingRunsHasError$ = this.trainingRunService.hasError$;
        this.loadingTrainingRuns$ = this.trainingRunService.isLoading$;
    }
}
