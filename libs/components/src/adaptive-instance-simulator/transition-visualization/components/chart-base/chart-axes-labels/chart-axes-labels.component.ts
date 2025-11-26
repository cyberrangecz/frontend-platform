import { ChangeDetectionStrategy, Component, ElementRef, Input, inject } from '@angular/core';
import * as d3 from 'd3';
import {YAxisLeftLabelComponent} from "./y-axis-left-lable/y-axis-left-label.component";

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[chart-axes-labels]',
    templateUrl: './chart-axes-labels.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        YAxisLeftLabelComponent
    ]
})
export class ChartAxesLabelsComponent {
    @Input() margin!: any;
    @Input() svgHeight!: number;

    private g: any;

    constructor() {
        const element = inject(ElementRef);

        this.g = d3.select(element.nativeElement);
    }
}
