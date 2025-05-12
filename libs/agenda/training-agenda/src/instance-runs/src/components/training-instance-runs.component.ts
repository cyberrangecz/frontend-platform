import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { SentinelControlItem } from '@sentinel/components/controls';
import { TrainingInstance, TrainingRun } from '@crczp/training-model';
import { SentinelTable, TableActionEvent, TableLoadEvent } from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { TrainingRunTable } from '../model/training-run-table';
import { TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME } from '../../../index';
import { TrainingRunService } from '../services/runs/training-run.service';
import { DefaultPaginationService } from '@crczp/training-agenda/internal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Smart component of training instance runs
 */
@Component({
    selector: 'crczp-training-instance-runs',
    templateUrl: './training-instance-runs.component.html',
    styleUrls: ['./training-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingInstanceRunsComponent implements OnInit {
    @Input() paginationId = 'training-instance-runs';
    trainingInstance$: Observable<TrainingInstance>;
    trainingRuns$: Observable<SentinelTable<TrainingRun>>;
    trainingRunsHasError$: Observable<boolean>;
    loadingTrainingRuns$: Observable<boolean>;
    archivedTrainingRunsControls: SentinelControlItem[];
    selectedArchivedTrainingRunIds: number[] = [];
    destroyRef = inject(DestroyRef);

    private trainingInstance: TrainingInstance;

    constructor(
        private activeRoute: ActivatedRoute,
        private paginationService: DefaultPaginationService,
        private trainingRunService: TrainingRunService,
    ) {
    }

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            map((data) => data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]),
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

    onTrainingRunsLoadEvent(loadEvent: TableLoadEvent): void {
        this.paginationService.setPagination(this.paginationId, loadEvent.pagination.size);
        this.trainingRunService
            .getAll(this.trainingInstance.id, new OffsetPaginationEvent(0, loadEvent.pagination.size, '', 'asc'))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initRunsOverviewComponent() {
        const initialPagination = new OffsetPaginationEvent(
            0,
            this.paginationService.getPagination(this.paginationId),
            '',
            'asc',
        );

        this.trainingInstance$
            .pipe(
                take(1),
                switchMap((ti) => this.trainingRunService.getAll(ti.id, initialPagination)),
            )
            .subscribe();

        this.trainingRuns$ = this.trainingRunService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => {
                return new TrainingRunTable(resource, this.trainingRunService, this.trainingInstance);
            }),
        );

        this.trainingRunsHasError$ = this.trainingRunService.hasError$;
        this.loadingTrainingRuns$ = this.trainingRunService.isLoading$;
    }
}
