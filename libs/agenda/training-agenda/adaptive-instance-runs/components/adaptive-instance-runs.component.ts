import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance, TrainingRun } from '@crczp/training-model';
import { SentinelTable } from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AdaptiveRunTable } from '../model/adaptive-run-table';
import { AdaptiveRunService } from '../services/runs/adaptive-run.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PortalConfig } from '@crczp/utils';
import { AdaptiveRunOverviewComponent } from './training-run-overview/adaptive-run-overview.component';
import { MatCard } from '@angular/material/card';
import { AsyncPipe } from '@angular/common';
import { AdaptiveRunConcreteService } from '../services/runs/adaptive-run-concrete.service';
import { createPaginationEvent } from '@crczp/api-common';
import { TrainingRunSort } from '@crczp/training-api';

/**
 * Smart component of training instance runs
 */
@Component({
    selector: 'crczp-adaptive-instance-runs',
    templateUrl: './adaptive-instance-runs.component.html',
    styleUrls: ['./adaptive-instance-runs.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AdaptiveRunOverviewComponent, MatCard, AsyncPipe],
    providers: [
        {
            provide: AdaptiveRunService,
            useClass: AdaptiveRunConcreteService,
        },
    ],
})
export class AdaptiveInstanceRunsComponent implements OnInit {
    trainingInstance$: Observable<TrainingInstance>;
    trainingRuns$: Observable<SentinelTable<TrainingRun, string>>;
    trainingRunsHasError$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    defaultPageSize = inject(PortalConfig).defaultPageSize;
    private activeRoute = inject(ActivatedRoute);
    private adaptiveRunService = inject(AdaptiveRunService);
    private trainingInstance: TrainingInstance;

    private readonly initialRunsPagination =
        createPaginationEvent<TrainingRunSort>({
            sort: 'start_time',
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

    private initRunsOverviewComponent() {
        this.trainingInstance$
            .pipe(
                take(1),
                switchMap((ti) =>
                    this.adaptiveRunService.getAll(
                        ti.id,
                        this.initialRunsPagination,
                    ),
                ),
            )
            .subscribe();
        this.trainingRuns$ = this.adaptiveRunService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => {
                return new AdaptiveRunTable(
                    resource,
                    this.adaptiveRunService,
                    this.trainingInstance,
                );
            }),
        );

        this.trainingRunsHasError$ = this.adaptiveRunService.hasError$;
    }
}
