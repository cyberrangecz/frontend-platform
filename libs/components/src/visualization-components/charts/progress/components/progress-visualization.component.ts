import { ChangeDetectionStrategy, Component, computed, inject, Injector, input, OnInit, runInInjectionContext } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SegmentedToggleComponent, SegmentedToggleOption } from '../../../../segmented-toggle/segmented-toggle.component';
import { ChartPanelShellComponent } from '../../shared';
import { ChartRendererService } from '../services/chart-renderer.interface.service';
import { ChartRendererServiceImpl } from '../services/chart-renderer.service';
import { LegendTransitionSchedulerService } from '../services/legend-transition-scheduler.service';
import { ProgressFeedService } from '../services/progress-feed.interface.service';
import { ProgressFeedServiceImpl } from '../services/progress-feed.service';
import { ProgressUiStateService } from '../services/progress-ui-state.interface.service';
import { ProgressUiStateServiceImpl } from '../services/progress-ui-state.service';
import { InstanceId } from '../types/ids.types';
import { AxisMode, SORT_CRITERIA, SortCriterion } from '../types/ui-state.types';
import { StepperItemVm } from '../types/view-model.types';
import { ProgressChartComponent } from './progress-chart.component';
import { ProgressStepperComponent } from './progress-stepper.component';

/**
 * Root component of the progress visualization.
 *
 * Declares the component-scoped services in `providers` so each instance gets
 * an isolated legend scheduler, feed, UI state, and shared chart-state holder.
 * Binds the feed to the `instanceId` input once during the OnInit lifecycle
 * hook; the feed implementation reads the signal internally so re-scoping is
 * driven by the input signal itself.
 *
 * Renders the chart child component. The chart child binds the renderer
 * to its host element during its view-init phase; no rendering glue lives
 * at this level.
 */
@Component({
    selector: 'crczp-progress-visualization',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ChartPanelShellComponent,
        ProgressChartComponent,
        ProgressStepperComponent,
        SegmentedToggleComponent,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatTooltipModule,
    ],
    providers: [
        LegendTransitionSchedulerService,
        { provide: ProgressFeedService, useClass: ProgressFeedServiceImpl },
        { provide: ProgressUiStateService, useClass: ProgressUiStateServiceImpl },
        { provide: ChartRendererService, useClass: ChartRendererServiceImpl },
    ],
    styleUrl: './progress-visualization.component.scss',
    templateUrl: './progress-visualization.component.html',
})
export class ProgressVisualizationComponent implements OnInit {
    readonly instanceId = input.required<InstanceId>();

    private readonly injector = inject(Injector);

    protected readonly feed = inject(ProgressFeedService);
    protected readonly ui = inject(ProgressUiStateService);
    protected readonly renderer = inject(ChartRendererService);

    protected readonly stepperItems = computed<readonly StepperItemVm[] | null>(() => {
        const vm = this.feed.viewModel();
        return vm === null ? null : vm.stepper;
    });

    protected readonly selectedLevelOrder = this.ui.selectedLevelOrder;
    protected readonly highlightedLevelOrder = this.ui.highlightedLevelOrder;

    protected readonly axisMode = this.ui.axisMode;

    protected readonly axisModeOptions: readonly (SegmentedToggleOption & { value: AxisMode })[] = [
        { value: 'absolute', label: 'Clock', icon: 'schedule' },
        { value: 'duration', label: 'Duration', icon: 'timer' },
    ];

    protected readonly sortCriteria: readonly SortCriterion[] = SORT_CRITERIA;

    protected readonly criterionLabels: Record<SortCriterion, string> = {
        TRAINEE_NAME: 'Trainee name',
        CURRENT_LEVEL_ORDER: 'Current level',
        CURRENT_SCORE: 'Score',
        LAG_TIME: 'Lag time',
        LAG_PERCENTAGE: 'Lag percentage',
        TRAINING_RUN_START: 'Run start',
    };

    ngOnInit(): void {
        runInInjectionContext(this.injector, () => this.feed.bind(this.instanceId));
    }

    protected onStepClicked(order: number): void {
        const current = this.ui.selectedLevelOrder();
        this.ui.setSelectedLevel(current === order ? null : order);
    }

    protected onStepHovered(order: number | null): void {
        this.ui.setHighlightedLevel(order);
    }

    protected onSortCriterionChanged(criterion: SortCriterion): void {
        this.ui.setSort(criterion, this.ui.sortDirection());
    }

    /**
     * Applies a new X-axis scale mode. Resets the horizontal zoom to full extent
     * first so the preserved window does not carry over into the re-anchored
     * axis; the vertical row-scroll is left untouched.
     *
     * @param mode - The selected axis mode emitted by the segmented toggle; one
     *               of the {@link axisModeOptions} values.
     */
    protected onAxisModeChanged(mode: string): void {
        this.renderer.resetZoom();
        this.ui.setAxisMode(mode as AxisMode);
    }
}
