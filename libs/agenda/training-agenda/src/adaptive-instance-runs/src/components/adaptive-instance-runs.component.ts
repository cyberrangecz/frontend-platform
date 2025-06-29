import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { SentinelControlItem } from '@sentinel/components/controls';
import { TrainingInstance, TrainingRun } from '@crczp/training-model';
import { SentinelTable, TableActionEvent } from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AdaptiveRunTable } from '../model/adaptive-run-table';
import { AdaptiveRunService } from '../services/runs/adaptive-run.service';
import { DefaultPaginationService } from '@crczp/training-agenda/internal';
import { ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME } from '../../../index';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Smart component of training instance runs
 */
@Component({
    selector: 'crczp-adaptive-instance-runs',
    templateUrl: './adaptive-instance-runs.component.html',
    styleUrls: ['./adaptive-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdaptiveInstanceRunsComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    trainingRuns$: Observable<SentinelTable<TrainingRun>>;
    trainingRunsHasError$: Observable<boolean>;
    trainingRunsControls: SentinelControlItem[];
    selectedTrainingRunIds: number[] = [];
    destroyRef = inject(DestroyRef);

    private trainingInstance: TrainingInstance;

    constructor(
        private activeRoute: ActivatedRoute,
        private paginationService: PaginationStorageService,
        private adaptiveRunService: AdaptiveRunService,
    ) {
    }

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            map((data) => data[ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]),
            tap((ti) => {
                this.trainingInstance = ti;
            }),
        );

        this.initRunsOverviewComponent();
    }

    /**
     * Resolves type of action and calls handler
     * @param event action event emitted from table
     */
    onTrainingRunsTableAction(event: TableActionEvent<TrainingRun>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    private initRunsOverviewComponent() {
        const initialPagination = new OffsetPaginationEvent(0, this.paginationService.DEFAULT_PAGINATION, '', 'asc');
        this.trainingInstance$
            .pipe(
                take(1),
                switchMap((ti) => this.adaptiveRunService.getAll(ti.id, initialPagination)),
            )
            .subscribe();
        this.trainingRuns$ = this.adaptiveRunService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => {
                return new AdaptiveRunTable(resource, this.adaptiveRunService, this.trainingInstance);
            }),
        );

        this.trainingRunsHasError$ = this.adaptiveRunService.hasError$;
    }
}
