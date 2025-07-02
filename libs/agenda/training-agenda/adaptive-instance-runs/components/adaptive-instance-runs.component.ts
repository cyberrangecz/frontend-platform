import {ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {SentinelControlItemSignal} from '@sentinel/components/controls';
import {TrainingInstance, TrainingRun} from '@crczp/training-model';
import {SentinelTable, TableActionEvent} from '@sentinel/components/table';
import {async, Observable} from 'rxjs';
import {map, switchMap, take, tap} from 'rxjs/operators';
import {AdaptiveRunTable} from '../model/adaptive-run-table';
import {AdaptiveRunService} from '../services/runs/adaptive-run.service';
import {ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PaginationStorageService} from "@crczp/common";
import {AdaptiveRunOverviewComponent} from "./training-run-overview/adaptive-run-overview.component";
import {MatCard} from "@angular/material/card";
import {AsyncPipe, NgIf} from "@angular/common";

/**
 * Smart component of training instance runs
 */
@Component({
    selector: 'crczp-adaptive-instance-runs',
    templateUrl: './adaptive-instance-runs.component.html',
    styleUrls: ['./adaptive-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AdaptiveRunOverviewComponent,
        MatCard,
        NgIf,
        AsyncPipe
    ]
})
export class AdaptiveInstanceRunsComponent implements OnInit {
    private activeRoute = inject(ActivatedRoute);
    private paginationService = inject(PaginationStorageService);
    private adaptiveRunService = inject(AdaptiveRunService);

    trainingInstance$: Observable<TrainingInstance>;
    trainingRuns$: Observable<SentinelTable<TrainingRun>>;
    trainingRunsHasError$: Observable<boolean>;
    trainingRunsControls: SentinelControlItemSignal[];
    selectedTrainingRunIds: number[] = [];
    destroyRef = inject(DestroyRef);
    protected readonly async = async;
    private trainingInstance: TrainingInstance;

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
        const initialPagination = new OffsetPaginationEvent(0, this.paginationService.DEFAULT_PAGE_SIZE, '', 'asc');
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
