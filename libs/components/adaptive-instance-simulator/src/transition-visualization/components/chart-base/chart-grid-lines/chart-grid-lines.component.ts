import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, inject } from '@angular/core';
import * as d3 from 'd3';
import {YAxisGridLinesComponent} from "./y-axis-grid-lines/y-axis-grid-lines.component";
import {XAxisGridLinesComponent} from "./x-axis-grid-lines/x-axis-grid-lines.component";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-grid-lines]',
    templateUrl: './chart-grid-lines.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        YAxisGridLinesComponent,
        XAxisGridLinesComponent
    ]
})
export class ChartGridLinesComponent {
    private ref = inject(ChangeDetectorRef);

    @Input() xScale!: d3.ScalePoint<number>;
    @Input() yScale!: d3.ScalePoint<number>;

    @Input() svgWidth!: number;
    @Input() svgHeight!: number;

    private g: any;

    constructor() {
        const element = inject(ElementRef);

        this.g = d3.select(element.nativeElement);
    }
}
