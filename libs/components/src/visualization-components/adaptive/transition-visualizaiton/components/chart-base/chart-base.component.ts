import { ChangeDetectionStrategy, Component, ElementRef, Input, inject } from '@angular/core';
import * as d3 from 'd3';
import {TransitionPhase} from '@crczp/visualization-model';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-base]',
    templateUrl: './chart-base.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartBaseComponent {
    @Input() phases!: TransitionPhase[];

    @Input() margin!: any;

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
