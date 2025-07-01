import {ChangeDetectionStrategy, Component, ElementRef, Input} from '@angular/core';
import * as d3 from 'd3';
import {AdaptiveVisualizationPhase} from '../../model/phase/adaptive-visualization-phase';
import {ChartAxesComponent} from "./chart-axes/chart-axes.component";
import {ChartGridLinesComponent} from "./chart-grid-lines/chart-grid-lines.component";
import {ChartAxesLabelsComponent} from "./chart-axes-labels/chart-axes-labels.component";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-base]',
    templateUrl: './chart-base.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ChartAxesComponent,
        ChartGridLinesComponent,
        ChartAxesLabelsComponent
    ]
})
export class ChartBaseComponent {
    @Input() phases!: AdaptiveVisualizationPhase[];

    @Input() margin!: any;

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;

    @Input() svgWidth!: number;
    @Input() svgHeight!: number;

    private g: any;

    constructor(element: ElementRef) {
        this.g = d3.select(element.nativeElement);
    }
}
