import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {TrainingInstance, TrainingRun} from '@crczp/training-model';
import {Observable} from 'rxjs';
import {map, switchMap, take, tap} from 'rxjs/operators';
import {
    TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME,
    TrainingNavigator,
    TrainingNotificationService,
} from '@crczp/training-agenda';
import {TrainingInstanceSummaryService} from '../services/state/summary/training-instance-summary.service';
import {SentinelTable, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {TrainingRunService} from '../services/state/runs/training-run.service';
import {TrainingRunTable} from '../model/training-run-table';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PaginationStorageService} from "@crczp/common";

/**
 * Smart component of training instance summary
 */
@Component({
    selector: 'crczp-training-instance-summary',
    templateUrl: './training-instance-summary.component.html',
    styleUrls: ['./training-instance-summary.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingInstanceSummaryComponent implements OnInit {
    @Input() paginationId = 'training-instance-summary';

    trainingInstance$: Observable<TrainingInstance>;
    hasStarted$: Observable<boolean>;
    trainingRuns$: Observable<SentinelTable<TrainingRun>>;
    trainingRunsHasError$: Observable<boolean>;

    trainingInstanceAccessTokenLink: string;
    trainingInstancePoolIdLink: string;
    trainingDefinitionLink: string;

    destroyRef = inject(DestroyRef);

    constructor(
        private activeRoute: ActivatedRoute,
        private navigator: TrainingNavigator,
        private trainingInstanceSummaryService: TrainingInstanceSummaryService,
        private notificationService: TrainingNotificationService,
        private paginationService: PaginationStorageService,
        private trainingRunService: TrainingRunService,
    ) {
    }

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            map((data) => data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]),
            tap((ti) => {
                this.initSummaryComponent(ti);
            }),
        );
        this.initTrainingRunsComponent();
    }

    /**
     * Resolves type of action and calls handler
     * @param event action event emitted from table
     */
    onTrainingRunTableAction(event: TableActionEvent<TrainingRun>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    /**
     * Calls service to get new data for table
     * @param event reload data event emitted from table
     */
    onTrainingRunTableLoadEvent(event: TableLoadEvent): void {
        this.paginationService.savePageSize(event.pagination.size);
        this.trainingInstance$
            .pipe(
                switchMap((ti) =>
                    this.trainingRunService.getAll(
                        ti.id,
                        new OffsetPaginationEvent(
                            0,
                            event.pagination.size,
                            event.pagination.sort,
                            event.pagination.sortDir,
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    onTrainingRunTableRowExpand(trainingRunId: number): void {
        this.trainingRunService.getInfo(trainingRunId).pipe();
    }

    onShowProgress(): void {
        this.trainingInstanceSummaryService.showProgress();
    }

    onShowResults(): void {
        this.trainingInstanceSummaryService.showResults();
    }

    onShowAggregatedResults(): void {
        this.trainingInstanceSummaryService.showAggregatedResults();
    }

    onShowNotification(data: string[]): void {
        this.notificationService.emit(data[0] as any, data[1]);
    }

    onShowCheatingDetection(): void {
        this.trainingInstanceSummaryService.showCheatingDetection();
    }

    onExportScore(): void {
        this.trainingInstance$
            .pipe(
                switchMap((ti) => this.trainingRunService.exportScore(ti.id)),
                take(1),
            )
            .subscribe();
    }

    private initSummaryComponent(trainingInstance: TrainingInstance) {
        this.trainingInstanceSummaryService.init(trainingInstance);
        this.trainingInstanceAccessTokenLink = `/${this.navigator.toTrainingInstanceAccessToken(trainingInstance.id)}`;
        this.trainingInstancePoolIdLink = `/${this.navigator.toPool(trainingInstance.poolId)}`;
        this.trainingDefinitionLink = `/${this.navigator.toTrainingDefinitionDetail(
            trainingInstance.trainingDefinition.id,
        )}`;
        this.hasStarted$ = this.trainingInstanceSummaryService.hasStarted$;
    }

    private initTrainingRunsComponent() {
        const initialPagination = new OffsetPaginationEvent(
            0,
            this.paginationService.loadPageSize(),
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
            map((resource) => new TrainingRunTable(resource)),
        );
        this.trainingRunsHasError$ = this.trainingRunService.hasError$;
    }
}
