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
    template: `
        <div
            #host
            class="progress-chart-host"
        ></div>
    `,
    styles: [
        `
            :host {
                display: block;
                width: 100%;
                height: 100%;
            }
            .progress-chart-host {
                width: 100%;
                height: 100%;
            }
        `,
    ],
})
export class ProgressChartComponent {
    private readonly feed = inject(ProgressFeedService);
    private readonly renderer = inject(ChartRendererService);

    private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

    constructor() {
        afterNextRender(() => {
            this.renderer.bind(this.host().nativeElement, this.feed.viewModel);
        });
    }
}
