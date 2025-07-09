import {ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {TrainingInstance, TrainingRun} from '@crczp/training-model';
import {Observable} from 'rxjs';
import {map, switchMap, take, tap} from 'rxjs/operators';
import {
    ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME,
    TrainingNavigator,
    TrainingNotificationService,
} from '@crczp/training-agenda';
import {AdaptiveInstanceSummaryService} from '../services/state/summary/adaptive-instance-summary.service';
import {SentinelTable, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {AdaptiveRunService} from '../services/state/runs/adaptive-run.service';
import {AdaptiveRunTable} from '../model/adaptive-run-table';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PaginationStorageService, providePaginationStorageService} from "@crczp/common";
import {
    AdaptiveInstanceSummaryConcreteService
} from "../services/state/summary/adaptive-instance-summary-concrete.service";
import {AdaptiveRunConcreteService} from "../services/state/runs/adaptive-run-concrete.service";
import {MatCard} from "@angular/material/card";
import {AdaptiveInstanceInfoComponent} from "./info/adaptive-instance-info.component";
import {AdaptiveInstanceRunsComponent} from "./runs/adaptive-instance-runs.component";
import {AsyncPipe} from "@angular/common";

/**
 * Smart component of adaptive instance summary
 */
@Component({
    selector: 'crczp-adaptive-instance-summary',
    templateUrl: './adaptive-instance-summary.component.html',
    styleUrls: ['./adaptive-instance-summary.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {provide: AdaptiveInstanceSummaryService, useClass: AdaptiveInstanceSummaryConcreteService},
        {provide: AdaptiveRunService, useClass: AdaptiveRunConcreteService},
        providePaginationStorageService(AdaptiveInstanceSummaryComponent)
    ],
    imports: [
        MatCard,
        AdaptiveInstanceInfoComponent,
        AdaptiveInstanceRunsComponent,
        AsyncPipe
    ]
})
export class AdaptiveInstanceSummaryComponent implements OnInit {
    @Input() paginationId = 'adaptive-instance-summary';
    trainingInstance$: Observable<TrainingInstance>;
    adaptiveRuns$: Observable<SentinelTable<TrainingRun>>;
    adaptiveRunsHasError$: Observable<boolean>;
    hasStarted$: Observable<boolean>;
    trainingInstanceAccessTokenLink: string;
    trainingInstancePoolIdLink: string;
    adaptiveDefinitionLink: string;
    hasPool: boolean;
    destroyRef = inject(DestroyRef);
    private activeRoute = inject(ActivatedRoute);
    private navigator = inject(TrainingNavigator);
    private adaptiveInstanceSummaryService = inject(AdaptiveInstanceSummaryService);
    private paginationService = inject(PaginationStorageService);
    private adaptiveRunService = inject(AdaptiveRunService);
    private notificationService = inject(TrainingNotificationService);

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            map((data) => data[ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]),
            tap((ti) => {
                this.initSummaryComponent(ti);
            }),
        );
        this.initAdaptiveRunsComponent();
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
                    this.adaptiveRunService.getAll(
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

    onShowProgress(): void {
        this.adaptiveInstanceSummaryService.showProgress();
    }

    onShowNotification(data: string[]): void {
        this.notificationService.emit(data[0] as any, data[1]);
    }

    private initSummaryComponent(trainingInstance: TrainingInstance) {
        this.adaptiveInstanceSummaryService.init(trainingInstance);
        this.trainingInstanceAccessTokenLink = `/${this.navigator.toAdaptiveInstanceAccessToken(trainingInstance.id)}`;
        this.trainingInstancePoolIdLink = `/${this.navigator.toPool(trainingInstance.poolId)}`;
        this.adaptiveDefinitionLink = `/${this.navigator.toAdaptiveDefinitionDetail(
            trainingInstance.trainingDefinition.id,
        )}`;
        this.hasPool = trainingInstance.hasPool();
        this.hasStarted$ = this.adaptiveInstanceSummaryService.hasStarted$;
    }

    private initAdaptiveRunsComponent() {
        const initialPagination = new OffsetPaginationEvent(
            0,
            this.paginationService.loadPageSize(),
            '',
            'asc',
        );
        this.trainingInstance$
            .pipe(
                take(1),
                switchMap((ti) => this.adaptiveRunService.getAll(ti.id, initialPagination)),
            )
            .subscribe();
        this.adaptiveRuns$ = this.adaptiveRunService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => new AdaptiveRunTable(resource)),
        );
        this.adaptiveRunsHasError$ = this.adaptiveRunService.hasError$;
    }

}
