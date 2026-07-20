import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { ChartRendererService } from '../services/chart-renderer.interface.service';
import { ProgressFeedService } from '../services/progress-feed.interface.service';

/**
 * Chart child component. Thin: hosts the ECharts container element and
 * binds the renderer to it once on view init.
 *
 * Providers are inherited from the parent `ProgressVisualizationComponent`
 * so the renderer, feed, and UI state are scoped to the visualization
 * instance — not duplicated here.
 *
 * Holds no business logic and no template state beyond the container
 * reference.
 */
@Component({
    selector: 'crczp-progress-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './progress-chart.component.html',
    styleUrl: './progress-chart.component.scss',
})
export class ProgressChartComponent {
    protected readonly renderer = inject(ChartRendererService);
    private readonly feed = inject(ProgressFeedService);

    private readonly outer = viewChild.required<ElementRef<HTMLElement>>('outer');
    private readonly inner = viewChild.required<ElementRef<HTMLElement>>('inner');

    constructor() {
        afterNextRender(() => {
            this.renderer.bind(
                this.outer().nativeElement,
                this.inner().nativeElement,
                this.feed.viewModel,
            );
        });
    }
}
