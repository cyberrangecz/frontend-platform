import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { TrainingInstance, TrainingRun } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { TrainingInstanceSummaryService } from '../services/state/summary/training-instance-summary.service';
import { SentinelTable, TableLoadEvent } from '@sentinel/components/table';
import { TrainingRunService } from '../services/state/runs/training-run.service';
import { TrainingRunTable } from '../model/training-run-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    TrainingInstanceSummaryConcreteService
} from '../services/state/summary/training-instance-summary-concrete.service';
import { TrainingRunConcreteService } from '../services/state/runs/training-run-concrete.service';
import { MatCard } from '@angular/material/card';
import { TrainingInstanceInfoComponent } from './info/training-instance-info.component';
import { TrainingInstanceRunsComponent } from './runs/training-instance-runs.component';
import { AsyncPipe } from '@angular/common';
import { NotificationService, PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Smart component of training instance summary
 */
@Component({
    selector: 'crczp-training-instance-summary',
    templateUrl: './training-instance-summary.component.html',
    styleUrls: ['./training-instance-summary.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: TrainingInstanceSummaryService,
            useClass: TrainingInstanceSummaryConcreteService,
        },
        { provide: TrainingRunService, useClass: TrainingRunConcreteService },
        providePaginationStorageService(TrainingInstanceSummaryComponent),
    ],
    imports: [
        MatCard,
        TrainingInstanceInfoComponent,
        TrainingInstanceRunsComponent,
        AsyncPipe,
    ],
})
export class TrainingInstanceSummaryComponent implements OnInit {
    @Input() paginationId = 'training-instance-summary';
    trainingInstance$: Observable<TrainingInstance>;
    hasStarted$: Observable<boolean>;
    trainingRuns$: Observable<SentinelTable<TrainingRun, string>>;
    trainingRunsHasError$: Observable<boolean>;
    trainingInstanceAccessTokenLink: string;
    trainingInstancePoolIdLink: string;
    trainingDefinitionLink: string;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private trainingInstanceSummaryService = inject(
        TrainingInstanceSummaryService,
    );
    private notificationService = inject(NotificationService);
    private paginationService = inject(PaginationStorageService);
    private trainingRunService = inject(TrainingRunService);

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            map((data) => data[TrainingInstance.name] || null),
            tap((ti) => {
                this.initSummaryComponent(ti);
            }),
        );
        this.initTrainingRunsComponent();
    }

    /**
     * Calls service to get new data for table
     * @param event reload data event emitted from table
     */
    onTrainingRunTableLoadEvent(event: TableLoadEvent<string>): void {
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
        this.trainingInstanceAccessTokenLink = `/${Routing.RouteBuilder.linear_instance
            .instanceId(trainingInstance.id)
            .access_token.build()}`;
        this.trainingInstancePoolIdLink = `/${Routing.RouteBuilder.pool
            .poolId(trainingInstance.id)
            .build()}`;
        this.trainingDefinitionLink = `/${Routing.RouteBuilder.linear_definition
            .definitionId(trainingInstance.id)
            .detail.build()}`;
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
                switchMap((ti) =>
                    this.trainingRunService.getAll(ti.id, initialPagination),
                ),
            )
            .subscribe();
        this.trainingRuns$ = this.trainingRunService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => new TrainingRunTable(resource)),
        );
        this.trainingRunsHasError$ = this.trainingRunService.hasError$;
    }
}
