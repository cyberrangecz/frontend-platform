import {ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {AccessedTrainingRun} from '@crczp/training-model';
import {SentinelTable, SentinelTableComponent, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {AccessedTrainingRunTable} from '../model/accessed-training-run-table';
import {AccessedTrainingRunService} from '../services/state/training/accessed-training-run.service';
import {AccessedAdaptiveRunService} from '../services/state/adaptive/accessed-adaptive-run.service';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {AccessedTrainingRunControls} from '../model/accessed-training-run-controls';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PortalConfig} from "@crczp/common";
import {AsyncPipe} from "@angular/common";
import {AccessTrainingRunComponent} from "./access/access-training-run.component";
import {
    AccessAdaptiveRunResolver,
    AccessTrainingRunResolver,
    AdaptiveRunResultsResolver,
    TrainingRunResultsResolver
} from "@crczp/training-agenda/resolvers";
import {TrainingDefaultNavigator, TrainingNavigator} from "@crczp/training-agenda";
import {RunningTrainingRunConcreteService, RunningTrainingRunService} from "@crczp/training-agenda/run-detail";
import {RunningAdaptiveRunConcreteService, RunningAdaptiveRunService} from "@crczp/training-agenda/adaptive-run-detail";
import {AccessedTrainingRunConcreteService} from "../services/state/training/accessed-training-run-concrete.service";
import {AccessedAdaptiveRunConcreteService} from "../services/state/adaptive/accessed-adaptive-run-concrete.service";

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
        SentinelTableComponent
    ],
    providers: [
        AccessTrainingRunResolver,
        AccessAdaptiveRunResolver,
        TrainingRunResultsResolver,
        AdaptiveRunResultsResolver,
        {provide: TrainingNavigator, useClass: TrainingDefaultNavigator},
        {provide: RunningTrainingRunService, useClass: RunningTrainingRunConcreteService},
        {provide: RunningAdaptiveRunService, useClass: RunningAdaptiveRunConcreteService},
        {provide: AccessedTrainingRunService, useClass: AccessedTrainingRunConcreteService},
        {provide: AccessedAdaptiveRunService, useClass: AccessedAdaptiveRunConcreteService},
    ],
})
export class TrainingRunOverviewComponent implements OnInit {
    trainingRuns$: Observable<SentinelTable<AccessedTrainingRun>>;
    hasError$: Observable<boolean>;
    isLoading = false;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private trainingRunOverviewService = inject(AccessedTrainingRunService);
    private accessedAdaptiveRunService = inject(AccessedAdaptiveRunService);
    private settings = inject(PortalConfig);

    constructor() {
        const trainingRunOverviewService = this.trainingRunOverviewService;

        this.controls = AccessedTrainingRunControls.create(trainingRunOverviewService);
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
        if (this.isAdaptiveToken(accessToken)) {
            this.accessedAdaptiveRunService
                .access(accessToken)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => (this.isLoading = false));
        } else {
            this.trainingRunOverviewService
                .access(accessToken)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => (this.isLoading = false));
        }
    }

    /**
     * Resolves type of table action and handles it
     * @param event table action event
     */
    onTableAction(event: TableActionEvent<AccessedTrainingRun>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    /**
     * Loads training run data for the table component
     */
    loadAccessedTrainingRuns(loadEvent: TableLoadEvent): void {
        this.trainingRunOverviewService
            .getAll(new OffsetPaginationEvent(0, 0, '', 'asc'), loadEvent.filter)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    onControlsAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    private initTable() {
        const initialLoadEvent: TableLoadEvent = {
            pagination: new OffsetPaginationEvent(0, this.settings.defaultPageSize, '', 'asc'),
        };

        this.trainingRuns$ = this.trainingRunOverviewService.resource$.pipe(
            map((resource) => new AccessedTrainingRunTable(resource, this.trainingRunOverviewService)),
        );
        this.hasError$ = this.trainingRunOverviewService.hasError$;
        this.loadAccessedTrainingRuns(initialLoadEvent);
    }

    private isAdaptiveToken(accessToken: string): boolean {
        const re = new RegExp(/^[5-9].+$/);
        return re.test(accessToken.split('-')[1]);
    }
}
