import { ChangeDetectionStrategy, Component, ElementRef, Input, inject } from '@angular/core';
import * as d3 from 'd3';
import {AdaptiveVisualizationPhase} from '../../../model/phase/adaptive-visualization-phase';
import {XAxisBottomComponent} from "./x-axis-bottom/x-axis-bottom.component";
import {XAxisTopComponent} from "./x-axis-top/x-axis-top.component";
import {YAxisLeftComponent} from "./y-axis-left/y-axis-left.component";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-axes]',
    templateUrl: './chart-axes.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        XAxisBottomComponent,
        XAxisTopComponent,
        YAxisLeftComponent
    ]
})
export class ChartAxesComponent {
    @Input() phases!: AdaptiveVisualizationPhase[];

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;

    @Input() svgHeight!: number;

    private g: any;

    constructor() {
        const element = inject(ElementRef);

        this.g = d3.select(element.nativeElement);
    }
}
