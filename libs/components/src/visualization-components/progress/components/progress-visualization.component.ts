import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ChartRendererService } from '../services/chart-renderer.interface.service';
import { ChartRendererServiceImpl } from '../services/chart-renderer.service';
import { ProgressFeedService } from '../services/progress-feed.interface.service';
import { ProgressFeedServiceImpl } from '../services/progress-feed.service';
import { ProgressUiStateService } from '../services/progress-ui-state.interface.service';
import { ProgressUiStateServiceImpl } from '../services/progress-ui-state.service';
import { TimeInterpolationService } from '../services/time-interpolation.service';
import { InstanceId } from '../types/ids.types';
import { ProgressChartComponent } from './progress-chart.component';

/**
 * Root component of the progress visualization.
 *
 * Declares the four component-scoped services in `providers` so each
 * instance gets isolated time interpolation, feed, UI state, and renderer.
 * Binds the feed to the `instanceId` input once during construction; the
 * feed implementation reads the signal internally so re-scoping is driven
 * by the input signal itself.
 *
 * Renders the chart child component. The chart child binds the renderer
 * to its host element during its view-init phase; no rendering glue lives
 * at this level.
 */
@Component({
    selector: 'crczp-progress-visualization',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ProgressChartComponent],
    providers: [
        TimeInterpolationService,
        { provide: ProgressFeedService, useClass: ProgressFeedServiceImpl },
        { provide: ProgressUiStateService, useClass: ProgressUiStateServiceImpl },
        { provide: ChartRendererService, useClass: ChartRendererServiceImpl },
    ],
    styleUrl: './progress-visualization.component.scss',
    templateUrl: './progress-visualization.component.html',
})
export class ProgressVisualizationComponent {
    readonly instanceId = input.required<InstanceId>();

    private readonly feed = inject(ProgressFeedService);
    protected readonly ui = inject(ProgressUiStateService);
    protected readonly renderer = inject(ChartRendererService);

    constructor() {
        this.feed.bind(this.instanceId);
    }
}
