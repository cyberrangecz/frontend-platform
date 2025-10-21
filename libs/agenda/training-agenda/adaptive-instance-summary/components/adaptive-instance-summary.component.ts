import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AdaptiveInstanceSummaryService } from '../services/state/summary/adaptive-instance-summary.service';
import { TableLoadEvent } from '@sentinel/components/table';
import { AdaptiveRunService } from '../services/state/runs/adaptive-run.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AdaptiveInstanceSummaryConcreteService
} from '../services/state/summary/adaptive-instance-summary-concrete.service';
import { AdaptiveRunConcreteService } from '../services/state/runs/adaptive-run-concrete.service';
import { MatCard } from '@angular/material/card';
import { AdaptiveInstanceInfoComponent } from './info/adaptive-instance-info.component';
import { AdaptiveInstanceRunsComponent } from './runs/adaptive-instance-runs.component';
import { AsyncPipe } from '@angular/common';
import { AdaptiveRunTable } from '../model/adaptive-run-table';
import { NotificationService, PaginationStorageService, providePaginationStorageService } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { TrainingRunSort } from '@crczp/training-api';

/**
 * Smart component of adaptive instance summary
 */
@Component({
    selector: 'crczp-adaptive-instance-summary',
    templateUrl: './adaptive-instance-summary.component.html',
    styleUrls: ['./adaptive-instance-summary.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: AdaptiveInstanceSummaryService,
            useClass: AdaptiveInstanceSummaryConcreteService,
        },
        { provide: AdaptiveRunService, useClass: AdaptiveRunConcreteService },
        providePaginationStorageService(AdaptiveInstanceSummaryComponent),
    ],
    imports: [
        MatCard,
        AdaptiveInstanceInfoComponent,
        AdaptiveInstanceRunsComponent,
        AsyncPipe,
    ],
})
export class AdaptiveInstanceSummaryComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    adaptiveRuns$: Observable<AdaptiveRunTable>;
    adaptiveRunsHasError$: Observable<boolean>;
    hasStarted$: Observable<boolean>;
    trainingInstanceAccessTokenLink: string;
    trainingInstancePoolIdLink: string;
    adaptiveDefinitionLink: string;
    hasPool: boolean;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private adaptiveInstanceSummaryService = inject(
        AdaptiveInstanceSummaryService,
    );
    private paginationService = inject(PaginationStorageService);
    private adaptiveRunService = inject(AdaptiveRunService);
    private notificationService = inject(NotificationService);

    private readonly trainingRunPagination =
        createPaginationEvent<TrainingRunSort>({
            sort: 'startTime',
        });

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            map((data) => data[TrainingInstance.name] || null),
            tap((ti) => {
                this.initSummaryComponent(ti);
            }),
        );
        this.initAdaptiveRunsComponent();
    }

    /**
     * Calls service to get new data for table
     * @param event reload data event emitted from table
     */
    onTrainingRunTableLoadEvent(event: TableLoadEvent<TrainingRunSort>): void {
        this.paginationService.savePageSize(event.pagination.size);
        this.trainingInstance$
            .pipe(
                switchMap((ti) =>
                    this.adaptiveRunService.getAll(
                        ti.id,
                        PaginationMapper.toOffsetPaginationEvent(
                            event.pagination,
                        ),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    onShowProgress(): void {
        this.adaptiveInstanceSummaryService.showProgress();
    }

    onShowNotification(data: string[]): void {
        this.notificationService.emit(data[0] as any, data[1]);
    }

    private initSummaryComponent(trainingInstance: TrainingInstance) {
        this.adaptiveInstanceSummaryService.init(trainingInstance);
        this.trainingInstanceAccessTokenLink = `/${Routing.RouteBuilder.adaptive_instance
            .instanceId(trainingInstance.id)
            .access_token.build()}`;
        this.trainingInstancePoolIdLink = `/${Routing.RouteBuilder.pool
            .poolId(trainingInstance.poolId)
            .build()}`;
        this.adaptiveDefinitionLink = `/${Routing.RouteBuilder.adaptive_definition
            .definitionId(trainingInstance.id)
            .build()}`;

        //     this.navigator.toAdaptiveDefinitionDetail(
        //     trainingInstance.trainingDefinition.id,
        // )}`;
        this.hasPool = trainingInstance.hasPool();
        this.hasStarted$ = this.adaptiveInstanceSummaryService.hasStarted$;
    }

    private initAdaptiveRunsComponent() {
        this.trainingInstance$
            .pipe(
                take(1),
                switchMap((ti) =>
                    this.adaptiveRunService.getAll(
                        ti.id,
                        this.trainingRunPagination,
                    ),
                ),
            )
            .subscribe();
        this.adaptiveRuns$ = this.adaptiveRunService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => new AdaptiveRunTable(resource)),
        );
        this.adaptiveRunsHasError$ = this.adaptiveRunService.hasError$;
    }
}
