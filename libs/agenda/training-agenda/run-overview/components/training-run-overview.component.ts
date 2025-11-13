import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { AccessedTrainingRun, TrainingTypeEnum } from '@crczp/training-model';
import { SentinelTable, SentinelTableComponent, TableLoadEvent } from '@sentinel/components/table';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccessedTrainingRunTable } from '../model/accessed-training-run-table';
import { AccessedTrainingRunService } from '../services/state/accessed-training-run.service';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { AccessedTrainingRunControls } from '../model/accessed-training-run-controls';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { AccessTrainingRunComponent } from './access/access-training-run.component';

import { RunningTrainingRunService } from '@crczp/training-agenda/run-detail';
import {
    RunningAdaptiveRunConcreteService,
    RunningAdaptiveRunService
} from '@crczp/training-agenda/adaptive-run-detail';
import { createPaginationEvent, PaginationMapper } from '@crczp/api-common';
import { AccessedTrainingRunSort } from '@crczp/training-api';

/**
 * Main smart component of the trainee overview.
 */
@Component({
    selector: 'crczp-trainee-overview',
    templateUrl: './training-run-overview.component.html',
    styleUrls: ['./training-run-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        AccessTrainingRunComponent,
        SentinelControlsComponent,
        SentinelTableComponent,
    ],
    providers: [
        {
            provide: RunningTrainingRunService,
            useClass: RunningTrainingRunService,
        },
        {
            provide: RunningAdaptiveRunService,
            useClass: RunningAdaptiveRunConcreteService,
        },
        {
            provide: AccessedTrainingRunService,
            useClass: AccessedTrainingRunService,
        },
    ],
})
export class TrainingRunOverviewComponent implements OnInit {
    trainingRuns$: Observable<SentinelTable<AccessedTrainingRun, string>>;
    hasError$: Observable<boolean>;
    isLoading = false;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private trainingRunOverviewService = inject(AccessedTrainingRunService);

    private readonly initialRunPagination =
        createPaginationEvent<AccessedTrainingRunSort>({
            sort: 'endTime',
            sortDir: 'desc',
        });

    constructor() {
        const trainingRunOverviewService = this.trainingRunOverviewService;

        this.controls = AccessedTrainingRunControls.create(
            trainingRunOverviewService,
        );
    }

    ngOnInit(): void {
        this.initTable();
    }

    /**
     * According to PIN number calls service to access training run or adaptive run.
     * @param accessToken token to access the training run or adaptive run
     */
    access(accessToken: string): void {
        this.isLoading = true;
        this.trainingRunOverviewService
            .toAccessRun(
                accessToken,
                this.isAdaptiveToken(accessToken)
                    ? TrainingTypeEnum.ADAPTIVE
                    : TrainingTypeEnum.LINEAR,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => (this.isLoading = false));
    }

    /**
     * Loads training run data for the table component
     */
    loadAccessedTrainingRuns(
        loadEvent: TableLoadEvent<AccessedTrainingRunSort>,
    ): void {
        this.trainingRunOverviewService
            .getAll(
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
                loadEvent.filter,
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent<AccessedTrainingRunSort> = {
            pagination: this.initialRunPagination,
        };

        this.trainingRuns$ = this.trainingRunOverviewService.resource$.pipe(
            map(
                (resource) =>
                    new AccessedTrainingRunTable(
                        resource,
                        this.trainingRunOverviewService,
                    ),
            ),
        );
        this.hasError$ = this.trainingRunOverviewService.hasError$;
        this.loadAccessedTrainingRuns(initialLoadEvent);
    }

    private isAdaptiveToken(accessToken: string): boolean {
        const re = new RegExp(/^[5-9].+$/);
        return re.test(accessToken.split('-')[1]);
    }
}
