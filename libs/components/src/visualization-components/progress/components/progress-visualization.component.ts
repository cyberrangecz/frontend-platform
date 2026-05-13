import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { ChartRendererService } from '../services/chart-renderer.interface.service';
import { ProgressFeedService } from '../services/progress-feed.interface.service';
import { ProgressUiStateService } from '../services/progress-ui-state.interface.service';
import { InstanceId } from '../types/ids.types';

/**
 * Root component of the progress visualization.
 *
 * Declares the three component-scoped services in `providers` so each
 * instance gets isolated feed, UI state, and renderer. Binds the feed to
 * the `instanceId` input via an effect so navigating between instances
 * within the same component instance re-scopes the broker streams.
 *
 * Renders the stepper, controls, and chart child component. The chart
 * child binds the renderer to its host element during its view-init
 * phase; no rendering glue lives at this level.
 */
@Component({
    selector: 'crczp-progress-visualization',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        // ProgressFeedService — provided by impl class in code phase
        // ProgressUiStateService — provided by impl class in code phase
        // ChartRendererService — provided by impl class in code phase
        // LinearTrainingInstanceApi expected to be available from app-root scope
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
        effect(() => {
            this.feed.bind(this.instanceId);
        });
    }
}
